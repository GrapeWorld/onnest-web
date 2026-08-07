import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveOwnerMembership } from "@/lib/partnerAuth";

/** 업체 대표 전용 — 아직 수락되지 않은 초대를 취소한다. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const user = await getCurrentUser();
  const membership = user ? await getActiveOwnerMembership(user) : null;
  if (!user || !membership) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { invitationId } = await params;
  // 다른 업체 소속이거나 이미 수락·취소·만료 처리된 초대는 같은 404로
  // 묶는다 — 존재 여부를 노출하지 않는다(기존 팀 관리 라우트와 같은 원칙).
  const revoked = await prisma.partnerInvitation.updateMany({
    where: { id: invitationId, partnerId: membership.partnerId, usedAt: null, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  if (revoked.count !== 1) {
    return NextResponse.json({ error: "초대를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ id: invitationId });
}
