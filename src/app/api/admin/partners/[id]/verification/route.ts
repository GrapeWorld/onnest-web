import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  partnerVerificationStatuses,
  isVerificationReasonRequired,
  partnerVerificationStatusLabels,
} from "@/data/partnerVerification";
import { createNotifications } from "@/lib/notifications";
import { sendEmail, escapeHtml } from "@/lib/email";

const updateSchema = z
  .object({
    toStatus: z.enum(partnerVerificationStatuses, { error: "변경할 상태를 선택해주세요." }),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (isVerificationReasonRequired(data.toStatus) && !data.reason?.trim()) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "사유를 입력해주세요." });
    }
  });

/** 관리자 전용 — 업체 검증 상태 변경(검토 대기/승인/반려/이용 중지). */
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

  const { id } = await params;
  const { toStatus, reason } = parsed.data;

  let result: {
    error: "notfound" | "same" | null;
    members?: { id: string; email: string; name: string }[];
    partnerName?: string;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.partner.findUnique({
        where: { id },
        select: { id: true, name: true, verificationStatus: true },
      });
      if (!existing) return { error: "notfound" as const };
      if (existing.verificationStatus === toStatus) return { error: "same" as const };

      await tx.partner.update({
        where: { id },
        data: {
          verificationStatus: toStatus,
          verificationReason: reason || null,
          verifiedAt: new Date(),
          verifiedById: admin.id,
          verifiedByName: admin.name,
        },
      });
      await tx.partnerVerificationHistory.create({
        data: {
          partnerId: id,
          fromStatus: existing.verificationStatus,
          toStatus,
          reason: reason || null,
          actorId: admin.id,
          actorEmail: admin.email,
          actorName: admin.name,
        },
      });

      const members = await tx.partnerMembership.findMany({
        where: { partnerId: id, status: "ACTIVE" },
        select: { user: { select: { id: true, email: true, name: true } } },
      });
      const statusLabel = partnerVerificationStatusLabels[toStatus];
      await createNotifications(
        tx,
        members.map((member) => ({
          recipientUserId: member.user.id,
          type: "PARTNER_VERIFICATION_CHANGED" as const,
          title: "업체 이용 상태가 변경되었습니다",
          body: `업체 이용 상태가 "${statusLabel}"(으)로 변경되었습니다.`,
          internalPath: "/partner/company",
        })),
      );

      return {
        error: null,
        members: members.map((member) => member.user),
        partnerName: existing.name,
      };
    });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json({ error: "업체를 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "same") {
    return NextResponse.json({ error: "이미 같은 상태입니다." }, { status: 400 });
  }

  // 이용 중지는 포털 접근 자체를 막는 변경이라(getActiveMembership이
  // verificationStatus !== APPROVED를 거른다) 인앱 알림함을 볼 수 없을 수
  // 있다 — 이메일로도 반드시 안내한다.
  if (toStatus === "SUSPENDED" && result.members) {
    for (const member of result.members) {
      try {
        await sendEmail({
          to: member.email,
          subject: "[ONNEST] 업체 이용이 중지되었습니다",
          html: `
            <p>${escapeHtml(member.name)}님, 안녕하세요.</p>
            <p>${escapeHtml(result.partnerName ?? "소속 업체")}의 ONNEST 이용이 중지되었습니다.</p>
            <p>문의사항이 있으시면 운영팀에 연락해주세요.</p>
          `,
        });
      } catch (error) {
        console.error("[email] partner verification suspended notification failed", error);
      }
    }
  }

  return NextResponse.json({ id, verificationStatus: toStatus });
}
