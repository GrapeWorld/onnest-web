import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { paymentTiers } from "@/data/paymentTier";

const updateSchema = z.object({
  toTier: z.enum(paymentTiers, { error: "변경할 결제 등급을 선택해주세요." }),
  reason: z.string().trim().min(1, "변경 사유를 입력해주세요.").max(500),
});

/**
 * 결제 등급 변경. 아직 실제 결제 연동이 없어(memberStatus의 로그인 차단·
 * adminRole의 마지막 super 보호 같은 안전장치가 필요 없다) status 라우트보다
 * 단순하다 — 대상 조회·변경·이력 기록만 하나의 트랜잭션으로 묶는다.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { toTier, reason } = parsed.data;

  let result: { error: "notfound" | "same" | null };
  try {
    result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { id: true, paymentTier: true },
      });
      if (!target) return { error: "notfound" as const };
      if (target.paymentTier === toTier) return { error: "same" as const };

      await tx.user.update({ where: { id }, data: { paymentTier: toTier } });
      await tx.paymentTierHistory.create({
        data: {
          userId: id,
          fromTier: target.paymentTier,
          toTier,
          reason,
          adminId: admin.id,
          adminEmail: admin.email,
        },
      });
      return { error: null };
    });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json({ error: "회원을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "same") {
    return NextResponse.json({ error: "이미 같은 결제 등급입니다." }, { status: 400 });
  }

  return NextResponse.json({ id, paymentTier: toTier });
}
