import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});

/**
 * 고객 — 완료 확인(OK)을 마친 신청 1건당 1회 남기는 1~5점 후기. 업체는
 * 수정·삭제할 수 없다(이 라우트가 유일한 쓰기 경로다). 지금 단계에서는
 * 공개 페이지·업체 랭킹에 노출하지 않고 배정된 업체 포털·관리자 화면에만
 * 보여준다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("serviceReview", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { rating, comment } = parsed.data;

  let result: { error: "notfound" | "not-confirmed-ok" | "already-reviewed" | "no-partner" | null };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceRequest.findFirst({
        where: { id, project: { userId: user.id } },
        select: {
          id: true,
          partnerId: true,
          completionConfirmation: { select: { outcome: true } },
          review: { select: { id: true } },
        },
      });
      if (!existing) return { error: "notfound" as const };
      if (existing.completionConfirmation?.outcome !== "OK") {
        return { error: "not-confirmed-ok" as const };
      }
      if (existing.review) return { error: "already-reviewed" as const };
      if (!existing.partnerId) return { error: "no-partner" as const };

      await tx.serviceReview.create({
        data: {
          serviceRequestId: id,
          userId: user.id,
          partnerId: existing.partnerId,
          rating,
          comment: comment || null,
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
  if (result.error === "not-confirmed-ok") {
    return NextResponse.json(
      { error: "완료 확인(정상 완료)을 먼저 진행해주세요." },
      { status: 400 },
    );
  }
  if (result.error === "already-reviewed") {
    return NextResponse.json({ error: "이미 후기를 남겼습니다." }, { status: 400 });
  }
  if (result.error === "no-partner") {
    return NextResponse.json({ error: "담당 업체 정보를 찾을 수 없습니다." }, { status: 400 });
  }

  return NextResponse.json({ id, rating });
}
