import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { inquiryStatuses } from "@/data/inquiries";
import { escapeHtml, notifyInquiryAssignee, notifyInquiryCustomer } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { createNotification } from "@/lib/notifications";

const updateSchema = z.object({
  status: z.enum(inquiryStatuses).optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  nextAction: z.string().trim().max(200).optional().or(z.literal("")),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { status, nextAction } = parsed.data;
  const assigneeIdProvided = "assigneeId" in parsed.data && parsed.data.assigneeId !== undefined;
  const assigneeId = parsed.data.assigneeId ?? null;

  if (status === undefined && !assigneeIdProvided && nextAction === undefined) {
    return NextResponse.json(
      { error: "변경할 내용이 없습니다." },
      { status: 400 },
    );
  }

  const { id } = await params;

  let result: {
    error:
      | "notfound"
      | "assignee-notfound"
      | "assignee-not-admin"
      | "assignee-blocked"
      | "nochange"
      | null;
    inquiry?: {
      id: string;
      status: string;
      assigneeId: string | null;
      nextAction: string | null;
      email: string;
      name: string;
    };
    statusChanged?: boolean;
    newAssignee?: { email: string; name: string } | null;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.inquiry.findUnique({
        where: { id },
        select: { id: true, status: true, assigneeId: true, nextAction: true },
      });
      if (!existing) return { error: "notfound" as const };

      const nextNextAction =
        nextAction === undefined ? undefined : nextAction === "" ? null : nextAction;

      const statusChanged = status !== undefined && status !== existing.status;
      const assigneeChanged = assigneeIdProvided && assigneeId !== existing.assigneeId;
      const nextActionChanged =
        nextNextAction !== undefined && nextNextAction !== existing.nextAction;

      if (!statusChanged && !assigneeChanged && !nextActionChanged) {
        return { error: "nochange" as const };
      }

      let assigneeSnapshot: { id: string; email: string; name: string } | null = null;
      if (assigneeChanged && assigneeId !== null) {
        const target = await tx.user.findUnique({
          where: { id: assigneeId },
          select: { id: true, email: true, name: true, adminRole: true, status: true },
        });
        if (!target) return { error: "assignee-notfound" as const };
        if (!target.adminRole) return { error: "assignee-not-admin" as const };
        // 관리자 UI의 담당자 선택 목록도 status==="ACTIVE"만 보여준다 —
        // 서버 검증을 같은 기준으로 맞춰 API 직접 호출로 PENDING·DORMANT
        // 관리자에게 배정하는 것도 막는다.
        if (target.status !== "ACTIVE") {
          return { error: "assignee-blocked" as const };
        }
        assigneeSnapshot = { id: target.id, email: target.email, name: target.name };
      }

      const updateData: Record<string, unknown> = {};
      if (statusChanged) updateData.status = status;
      if (assigneeChanged) updateData.assigneeId = assigneeId;
      if (nextActionChanged) updateData.nextAction = nextNextAction;

      const updated = await tx.inquiry.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          status: true,
          assigneeId: true,
          nextAction: true,
          email: true,
          name: true,
        },
      });

      if (statusChanged) {
        await tx.inquiryActivity.create({
          data: {
            inquiryId: id,
            action: "STATUS_CHANGED",
            changes: { from: existing.status, to: status },
            actorId: admin.id,
            actorEmail: admin.email,
            actorName: admin.name,
          },
        });
      }
      if (assigneeChanged) {
        // 이전 담당자는 이미 탈퇴·강등됐을 수 있어 이메일을 다시 조회하지
        // 않는다 — changes에는 id만 남긴다(당시 스냅샷이 필요하면 이전
        // ASSIGNED 활동을 보면 된다).
        await tx.inquiryActivity.create({
          data: {
            inquiryId: id,
            action: assigneeId === null ? "UNASSIGNED" : "ASSIGNED",
            changes: {
              fromAssigneeId: existing.assigneeId,
              toAssigneeId: assigneeId,
              toAssigneeEmail: assigneeSnapshot?.email ?? null,
              toAssigneeName: assigneeSnapshot?.name ?? null,
            },
            actorId: admin.id,
            actorEmail: admin.email,
            actorName: admin.name,
          },
        });
        if (assigneeId !== null && assigneeSnapshot) {
          await createNotification(tx, {
            recipientUserId: assigneeSnapshot.id,
            type: "ADMIN_INQUIRY_ASSIGNED",
            title: "문의 담당자로 지정되었습니다",
            body: "새로 배정된 문의를 확인해주세요.",
            internalPath: `/admin/inquiries/${id}`,
          });
        }
      }
      if (nextActionChanged) {
        await tx.inquiryActivity.create({
          data: {
            inquiryId: id,
            action: "NEXT_ACTION_CHANGED",
            changes: { from: existing.nextAction, to: nextNextAction },
            actorId: admin.id,
            actorEmail: admin.email,
            actorName: admin.name,
          },
        });
      }

      return { error: null, inquiry: updated, statusChanged, newAssignee: assigneeSnapshot };
    }, { isolationLevel: "Serializable" });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json(
      { error: "문의를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "assignee-notfound") {
    return NextResponse.json(
      { error: "담당자를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "assignee-not-admin") {
    return NextResponse.json(
      { error: "관리자 계정만 담당자로 지정할 수 있습니다." },
      { status: 400 },
    );
  }
  if (result.error === "assignee-blocked") {
    return NextResponse.json(
      { error: "활성 상태(ACTIVE)의 관리자만 담당자로 지정할 수 있습니다." },
      { status: 400 },
    );
  }
  if (result.error === "nochange") {
    return NextResponse.json(
      { error: "변경 사항이 없습니다." },
      { status: 400 },
    );
  }

  // 상태가 실제로 바뀐 경우에만 고객에게 알린다. 알림 발송 실패가 이미
  // 저장된 변경 응답을 막지 않는다.
  if (result.statusChanged && result.inquiry) {
    try {
      const myInquiryUrl = new URL(
        `/my/inquiries/${result.inquiry.id}`,
        getAppUrl(),
      ).toString();
      await notifyInquiryCustomer({
        to: result.inquiry.email,
        subject: `[ONNEST] 문의 상태가 변경되었습니다`,
        html: `
          <p>안녕하세요, ${escapeHtml(result.inquiry.name)}님.</p>
          <p>문의 상태가 <strong>${escapeHtml(result.inquiry.status)}</strong>(으)로 변경됐습니다.</p>
          <p>로그인 후 마이페이지의 '내 문의'에서 확인해주세요.</p>
          <p><a href="${myInquiryUrl}">${myInquiryUrl}</a></p>
        `,
      });
    } catch (error) {
      console.error("[email] inquiry status customer notification failed", error);
    }
  }

  // 새로 배정된 담당자에게만 알린다(배정 해제는 알림 없음). 발송 실패가
  // 이미 저장된 배정 응답을 막지 않는다.
  if (result.newAssignee && result.inquiry) {
    try {
      const adminInquiryUrl = new URL(
        `/admin/inquiries/${result.inquiry.id}`,
        getAppUrl(),
      ).toString();
      await notifyInquiryAssignee({
        to: result.newAssignee.email,
        subject: "[ONNEST] 문의가 배정되었습니다",
        html: `
          <p>안녕하세요, ${escapeHtml(result.newAssignee.name)}님.</p>
          <p>새 문의가 담당자로 배정됐습니다.</p>
          <p><a href="${adminInquiryUrl}">${adminInquiryUrl}</a></p>
        `,
      });
    } catch (error) {
      console.error("[email] inquiry assignee notification failed", error);
    }
  }

  return NextResponse.json({ inquiry: result.inquiry });
}
