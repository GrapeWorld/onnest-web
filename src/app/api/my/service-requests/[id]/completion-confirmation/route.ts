import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";

const confirmationSchema = z.object({
  outcome: z.enum(["OK", "ISSUE"], { error: "확인 결과를 선택해주세요." }),
});

/**
 * 고객 — "작업 완료" 신청 1건당 1회 남기는 완료 확인. OK면 후기를 남길 수
 * 있게 되고(별도 라우트), ISSUE면 후기 대신 기존 문의 작성 화면으로
 * 안내한다(프런트에서 처리) — 새 민원 처리 체계를 만들지 않는다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("serviceCompletionConfirmation", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = confirmationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { outcome } = parsed.data;

  let result: { error: "notfound" | "not-completed" | "already-confirmed" | null };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceRequest.findFirst({
        where: { id, project: { userId: user.id } },
        select: {
          id: true,
          status: true,
          partnerId: true,
          completionConfirmation: { select: { id: true } },
        },
      });
      if (!existing) return { error: "notfound" as const };
      if (existing.status !== "작업 완료") return { error: "not-completed" as const };
      if (existing.completionConfirmation) return { error: "already-confirmed" as const };

      await tx.serviceCompletionConfirmation.create({
        data: { serviceRequestId: id, userId: user.id, outcome },
      });
      await tx.serviceRequestActivity.create({
        data: {
          serviceRequestId: id,
          action: "COMPLETION_CONFIRMED",
          changes: { outcome },
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: "CUSTOMER",
          partnerId: existing.partnerId,
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
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "not-completed") {
    return NextResponse.json({ error: "완료된 신청만 확인할 수 있습니다." }, { status: 400 });
  }
  if (result.error === "already-confirmed") {
    return NextResponse.json({ error: "이미 확인했습니다." }, { status: 400 });
  }

  return NextResponse.json({ id, outcome });
}
