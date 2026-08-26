import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { adminPropertySuggestionSchema } from "@/lib/propertySuggestionSchema";

/**
 * 공유 매물 정보 수정. 고객이 이미 "내 매물 후보에 저장"을 완료한 뒤에도
 * 수정 자체는 막지 않는다 — 다만 이미 만들어진 CandidateProperty는 별개
 * 레코드라 소급 반영되지 않는다(고객이 스스로 검토·수정해 저장한 값이므로).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.projectPropertySuggestion.findUnique({
    where: { id },
    select: { id: true, projectId: true, withdrawnAt: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "공유한 매물을 찾을 수 없습니다." }, { status: 404 });
  }
  if (existing.withdrawnAt) {
    return NextResponse.json({ error: "철회된 공유는 수정할 수 없습니다." }, { status: 409 });
  }

  const body = await request.json().catch(() => null);
  const parsed = adminPropertySuggestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }
  const data = parsed.data;

  if (data.sourceUrl) {
    const duplicate = await prisma.projectPropertySuggestion.findFirst({
      where: {
        projectId: existing.projectId,
        sourceUrl: data.sourceUrl,
        withdrawnAt: null,
        id: { not: id },
      },
      select: { id: true },
    });
    if (duplicate) {
      return NextResponse.json({ error: "이미 이 프로젝트에 공유된 매물 URL입니다." }, { status: 409 });
    }
  }

  await prisma.projectPropertySuggestion.update({
    where: { id },
    data: {
      sourceUrl: data.sourceUrl,
      title: data.title,
      address: data.address || null,
      transactionType: data.transactionType || null,
      price: data.price ?? null,
      deposit: data.deposit ?? null,
      monthlyRent: data.monthlyRent ?? null,
      area: data.area ?? null,
      roomCount: data.roomCount ?? null,
      availableDate: data.availableDate ? new Date(data.availableDate) : null,
      sharedReason: data.sharedReason || null,
      cautionNote: data.cautionNote || null,
      adminMemo: data.adminMemo || null,
    },
  });

  return NextResponse.json({ ok: true });
}
