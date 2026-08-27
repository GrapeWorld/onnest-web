import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { resolveActionItemsBySourceKey } from "@/lib/actionItems";

/**
 * 공유 철회. 실제 삭제 대신 withdrawnAt만 기록해 운영 이력을 보존한다 —
 * 고객이 이미 저장한 CandidateProperty(savedCandidatePropertyId)는 철회와
 * 무관하게 그대로 남는다(공유가 철회돼도 고객이 스스로 저장한 후보는
 * 건드리지 않는다).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.projectPropertySuggestion.findUnique({
    where: { id },
    select: { id: true, withdrawnAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "공유한 매물을 찾을 수 없습니다." }, { status: 404 });
  }
  if (existing.withdrawnAt) {
    return NextResponse.json({ error: "이미 철회된 공유입니다." }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectPropertySuggestion.update({
      where: { id },
      data: { withdrawnAt: new Date() },
    });
    await resolveActionItemsBySourceKey(tx, `CUSTOMER_REVIEW_PROPERTY:${id}`, "CANCELLED");
  });

  return NextResponse.json({ ok: true });
}
