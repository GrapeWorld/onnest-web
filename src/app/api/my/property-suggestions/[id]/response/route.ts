import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { propertySuggestionResponseSchema } from "@/lib/propertySuggestionSchema";
import { resolveActionItemsBySourceKey } from "@/lib/actionItems";

/**
 * 고객의 관심 응답(관심 있어요/조금 더 볼게요/이번에는 제외할게요) + 메모.
 * 고객은 이 두 필드만 바꿀 수 있고, 매물 정보 자체(관리자가 입력한 값)는
 * 이 라우트로 덮어쓸 수 없다.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.projectPropertySuggestion.findFirst({
    where: { id, project: { userId: user.id } },
    select: { id: true, withdrawnAt: true, savedCandidatePropertyId: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "공유된 매물을 찾을 수 없습니다." }, { status: 404 });
  }
  if (existing.withdrawnAt) {
    return NextResponse.json({ error: "철회된 공유입니다." }, { status: 409 });
  }
  if (existing.savedCandidatePropertyId) {
    return NextResponse.json(
      { error: "이미 매물 후보로 저장된 항목입니다. 매물 후보 화면에서 관리해주세요." },
      { status: 409 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = propertySuggestionResponseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.projectPropertySuggestion.update({
      where: { id },
      data: {
        customerStatus: parsed.data.customerStatus,
        customerMemo: parsed.data.customerMemo || null,
        respondedAt: new Date(),
      },
    });
    await resolveActionItemsBySourceKey(tx, `CUSTOMER_REVIEW_PROPERTY:${id}`, "COMPLETED");
  });

  return NextResponse.json({ ok: true });
}
