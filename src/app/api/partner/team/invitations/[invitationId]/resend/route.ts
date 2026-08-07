import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveOwnerMembership } from "@/lib/partnerAuth";
import { createInvitation } from "@/lib/partnerInvitation";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { escapeHtml, notifyPartnerInvitation } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

/**
 * 업체 대표 전용 — 기존 초대를 무효화하고 새 토큰으로 다시 발송한다. 원본
 * 토큰은 해시만 저장돼 있어 재사용이 불가능하므로(createInvitation 참고),
 * "재발송"은 항상 이전 초대 취소 + 새 초대 발급으로 구현한다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const user = await getCurrentUser();
  const membership = user ? await getActiveOwnerMembership(user) : null;
  if (!user || !membership) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const limit = await checkRateLimit("partnerInvite", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `초대 요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const { invitationId } = await params;
  const original = await prisma.partnerInvitation.findFirst({
    where: { id: invitationId, partnerId: membership.partnerId, usedAt: null, revokedAt: null },
    select: { email: true, role: true },
  });
  if (!original) {
    return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.partnerInvitation.updateMany({
    where: { id: invitationId, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: membership.partnerId },
    select: { name: true },
  });

  const token = await createInvitation({
    partnerId: membership.partnerId,
    email: original.email,
    role: original.role,
    invitedById: user.id,
  });

  const inviteUrl = new URL(`/partner/invitations/${token}`, getAppUrl()).toString();
  await notifyPartnerInvitation({
    to: original.email,
    subject: `[ONNEST] ${escapeHtml(partner.name)}에서 함께 일할 직원으로 초대합니다`,
    html: `
      <p>안녕하세요.</p>
      <p>${escapeHtml(partner.name)}에서 ONNEST 업체 포털의 직원으로 다시 초대했습니다.</p>
      <p>로그인 후 아래 링크에서 초대를 수락해주세요. 72시간 동안 유효합니다.</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    `,
  });

  return NextResponse.json({ email: original.email, role: original.role }, { status: 201 });
}
