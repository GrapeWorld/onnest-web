import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { escapeHtml, notifyAdmin, notifyPartnerStaff } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { serviceRequestCancelledStatus } from "@/data/serviceRequests";
import { createNotifications } from "@/lib/notifications";
import {
  getReadablePartnerRequestRecipients,
  getWritablePartnerRequestRecipients,
} from "@/lib/serviceRequestNotifications";
import { createActionItems } from "@/lib/actionItems";

const cancelSchema = z.object({
  reason: z.string().trim().max(500).optional(),
});

/**
 * 고객 — 자신의 서비스 신청을 취소한다.
 * - 업체 배정 전: 곧바로 "취소" 상태로 바꾼다.
 * - 업체 배정 후: 상태는 그대로 두고 cancelRequestedAt만 표시해 관리자·업체
 *   확인을 거치게 한다(실제 "취소" 확정은 관리자·업체가 기존 상태 변경
 *   경로로 한다). 선택한 견적은 취소 시 삭제하지 않고 보존한다 — 어떤
 *   견적을 선택했다가 취소했는지도 기록으로서 의미가 있기 때문이다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("serviceRequestCancel", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = cancelSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { reason } = parsed.data;

  let result: {
    error:
      | "notfound"
      | "completed"
      | "already-cancelled"
      | "already-requested"
      | "reason-required"
      | null;
    success?: { mode: "cancelled" | "requested"; partnerId: string | null; serviceType: string; projectId: string };
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceRequest.findFirst({
        where: { id, project: { userId: user.id } },
        select: {
          id: true,
          status: true,
          partnerId: true,
          partnerStaffId: true,
          serviceType: true,
          projectId: true,
          cancelRequestedAt: true,
        },
      });
      if (!existing) return { error: "notfound" as const };
      if (existing.status === "작업 완료") return { error: "completed" as const };
      if (existing.status === serviceRequestCancelledStatus) {
        return { error: "already-cancelled" as const };
      }
      if (existing.cancelRequestedAt) return { error: "already-requested" as const };

      if (!existing.partnerId) {
        // 배정 전 — 곧바로 취소한다.
        await tx.serviceRequest.update({
          where: { id },
          data: { status: serviceRequestCancelledStatus },
        });
        await tx.serviceRequestActivity.create({
          data: {
            serviceRequestId: id,
            action: "STATUS_CHANGED",
            changes: { from: existing.status, to: serviceRequestCancelledStatus, ...(reason ? { reason } : {}) },
            actorId: user.id,
            actorEmail: user.email,
            actorName: user.name,
            actorRole: "CUSTOMER",
            partnerId: null,
          },
        });
        return {
          error: null,
          success: {
            mode: "cancelled" as const,
            partnerId: null,
            serviceType: existing.serviceType,
            projectId: existing.projectId,
          },
        };
      }

      // 배정 후 — 취소 사유가 필수다(정책: 견적 선택 후에는 물론, 업체가
      // 이미 일하고 있을 수 있는 배정 후 취소는 전부 사유를 남기게 한다).
      if (!reason?.trim()) return { error: "reason-required" as const };

      await tx.serviceRequest.update({
        where: { id },
        data: { cancelRequestedAt: new Date(), cancelRequestReason: reason },
      });
      await tx.serviceRequestActivity.create({
        data: {
          serviceRequestId: id,
          action: "CANCEL_REQUESTED",
          changes: { reason },
          note: reason,
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: "CUSTOMER",
          partnerId: existing.partnerId,
        },
      });

      const recipients = await getReadablePartnerRequestRecipients(
        tx,
        existing.partnerId,
        existing.partnerStaffId,
      );
      await createNotifications(tx, [
        ...recipients.map((recipientUserId) => ({
          recipientUserId,
          type: "PARTNER_CANCEL_REQUESTED" as const,
          title: "고객이 취소를 요청했습니다",
          body: "확인 후 처리해주세요.",
          internalPath: `/partner/requests/${id}`,
        })),
      ]);
      const admins = await tx.user.findMany({
        where: { adminRole: { in: ["super", "viewer"] } },
        select: { id: true },
      });
      await createNotifications(
        tx,
        admins.map((adminUser) => ({
          recipientUserId: adminUser.id,
          type: "ADMIN_CUSTOMER_CANCEL_REQUESTED" as const,
          title: "고객이 취소를 요청했습니다",
          body: `${existing.serviceType} 서비스 신청의 취소 요청을 확인해주세요.`,
          internalPath: "/admin/service-leads",
          dedupeKey: `ADMIN_CUSTOMER_CANCEL_REQUESTED:${id}`,
        })),
      );

      const writableRecipients = await getWritablePartnerRequestRecipients(
        tx,
        existing.partnerId,
        existing.partnerStaffId,
      );
      await createActionItems(
        tx,
        writableRecipients.map((assigneeUserId) => ({
          assigneeUserId,
          type: "PARTNER_HANDLE_CANCEL_REQUEST" as const,
          title: "고객의 취소 요청을 확인해주세요",
          description: "고객이 취소를 요청했습니다. 확인 후 처리해주세요.",
          internalPath: `/partner/requests/${id}`,
          relatedEntityType: "ServiceRequest",
          relatedEntityId: id,
          sourceKey: `PARTNER_HANDLE_CANCEL_REQUEST:${id}`,
        })),
      );
      const superAdmins = await tx.user.findMany({ where: { adminRole: "super" }, select: { id: true } });
      await createActionItems(
        tx,
        superAdmins.map((adminUser) => ({
          assigneeUserId: adminUser.id,
          type: "ADMIN_HANDLE_CANCEL_REQUEST" as const,
          title: "고객의 취소 요청을 처리해주세요",
          description: `${existing.serviceType} 서비스 신청의 취소 요청을 확인해주세요.`,
          internalPath: "/admin/service-leads",
          relatedEntityType: "ServiceRequest",
          relatedEntityId: id,
          sourceKey: `ADMIN_HANDLE_CANCEL_REQUEST:${id}`,
        })),
      );

      return {
        error: null,
        success: {
          mode: "requested" as const,
          partnerId: existing.partnerId,
          serviceType: existing.serviceType,
          projectId: existing.projectId,
        },
      };
    }, { isolationLevel: "Serializable" });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "completed") {
    return NextResponse.json({ error: "이미 완료된 서비스는 취소할 수 없습니다." }, { status: 400 });
  }
  if (result.error === "already-cancelled") {
    return NextResponse.json({ error: "이미 취소된 신청입니다." }, { status: 400 });
  }
  if (result.error === "already-requested") {
    return NextResponse.json({ error: "이미 취소를 요청했습니다. 확인 후 연락드리겠습니다." }, { status: 400 });
  }
  if (result.error === "reason-required") {
    return NextResponse.json({ error: "취소 사유를 입력해주세요." }, { status: 400 });
  }
  if (!result.success) {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }

  const { mode, partnerId, serviceType } = result.success;

  try {
    await notifyAdmin({
      subject: mode === "cancelled"
        ? `[ONNEST] 고객이 서비스 신청을 취소했습니다`
        : `[ONNEST] 고객이 취소를 요청했습니다`,
      html: `
        <p>서비스 유형: ${escapeHtml(serviceType)}</p>
        <p>${mode === "cancelled" ? "고객이 배정 전 신청을 직접 취소했습니다." : "고객이 배정된 신청의 취소를 요청했습니다. 확인이 필요합니다."}</p>
        ${reason ? `<p>사유: ${escapeHtml(reason)}</p>` : ""}
      `,
    });

    if (mode === "requested" && partnerId) {
      const staff = await prisma.user.findMany({
        where: { partnerId, memberType: "PARTNER", status: "ACTIVE" },
        select: { email: true },
      });
      const portalUrl = new URL(`/partner/requests/${id}`, getAppUrl()).toString();
      await notifyPartnerStaff({
        to: staff.map((member) => member.email),
        subject: "[ONNEST] 고객이 취소를 요청했습니다",
        html: `
          <p>고객이 서비스 취소를 요청했습니다. 확인 후 처리해주세요.</p>
          ${reason ? `<p>사유: ${escapeHtml(reason)}</p>` : ""}
          <p><a href="${portalUrl}">업체 포털에서 확인하기</a></p>
        `,
      });
    }
  } catch (error) {
    console.error("[email] service request cancel notification failed", error);
  }

  return NextResponse.json({ id, mode });
}
