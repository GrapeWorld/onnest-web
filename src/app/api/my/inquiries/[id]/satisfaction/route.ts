import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";

const satisfactionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional().or(z.literal("")),
});

/** 문의가 "답변 완료" 상태일 때 고객이 1회 남기는 만족도 평가. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("inquirySatisfaction", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = satisfactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;

  let result: { error: "notfound" | "not-closed" | "already-rated" | null };
  try {
    result = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.inquiry.findFirst({
        where: { id, userId: user.id },
        select: { id: true, status: true, satisfactionSubmittedAt: true },
      });
      if (!inquiry) return { error: "notfound" as const };
      if (inquiry.status !== "답변 완료") return { error: "not-closed" as const };
      if (inquiry.satisfactionSubmittedAt) return { error: "already-rated" as const };

      const now = new Date();
      await tx.inquiry.update({
        where: { id },
        data: {
          satisfactionRating: parsed.data.rating,
          satisfactionComment: parsed.data.comment || null,
          satisfactionSubmittedAt: now,
        },
      });
      await tx.inquiryActivity.create({
        data: {
          inquiryId: id,
          action: "SATISFACTION_RATED",
          changes: { rating: parsed.data.rating, comment: parsed.data.comment || null },
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
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
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "not-closed") {
    return NextResponse.json(
      { error: "답변이 완료된 문의만 평가할 수 있습니다." },
      { status: 400 },
    );
  }
  if (result.error === "already-rated") {
    return NextResponse.json({ error: "이미 평가를 남겼습니다." }, { status: 400 });
  }

  return NextResponse.json({ id });
}
