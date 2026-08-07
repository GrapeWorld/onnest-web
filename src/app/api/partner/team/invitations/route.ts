import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveOwnerMembership } from "@/lib/partnerAuth";
import { createInvitation } from "@/lib/partnerInvitation";
import { invitablePartnerRoles } from "@/data/partnerRole";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { escapeHtml, notifyPartnerInvitation } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email("올바른 이메일 형식이 아닙니다."),
  role: z.enum(invitablePartnerRoles, { error: "역할을 선택해주세요." }),
});

/** 업체 대표 전용 — 직원을 이메일로 초대한다. */
export async function POST(request: Request) {
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

  const body = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { email, role } = parsed.data;

  const existingMember = await prisma.partnerMembership.findFirst({
    where: { partnerId: membership.partnerId, status: "ACTIVE", user: { email } },
  });
  if (existingMember) {
    return NextResponse.json(
      { error: "이미 우리 업체에 소속된 이메일입니다." },
      { status: 400 },
    );
  }

  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: membership.partnerId },
    select: { name: true },
  });

  const token = await createInvitation({
    partnerId: membership.partnerId,
    email,
    role,
    invitedById: user.id,
  });

  const inviteUrl = new URL(`/partner/invitations/${token}`, getAppUrl()).toString();
  await notifyPartnerInvitation({
    to: email,
    subject: `[ONNEST] ${escapeHtml(partner.name)}에서 함께 일할 직원으로 초대합니다`,
    html: `
      <p>안녕하세요.</p>
      <p>${escapeHtml(partner.name)}에서 ONNEST 업체 포털의 직원으로 초대했습니다.</p>
      <p>로그인 후 아래 링크에서 초대를 수락해주세요. 72시간 동안 유효합니다.</p>
      <p><a href="${inviteUrl}">${inviteUrl}</a></p>
    `,
  });

  return NextResponse.json({ email, role }, { status: 201 });
}
