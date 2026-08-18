import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { propertyPreferenceSchema } from "@/lib/candidatePropertySchema";

/** 내 희망 조건. 저장한 적이 없으면 null을 돌려준다. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const preference = await prisma.propertyPreference.findUnique({
    where: { userId: user.id },
  });

  return NextResponse.json(preference);
}

/** 희망 조건 저장(upsert). 사용자당 1개만 유지한다. */
export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("candidateProperty", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = propertyPreferenceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const values = {
    desiredRegion: data.desiredRegion || null,
    transactionType: data.transactionType || null,
    minBudget: data.minBudget ?? null,
    maxBudget: data.maxBudget ?? null,
    minArea: data.minArea ?? null,
    minRooms: data.minRooms ?? null,
    desiredMoveInDate: data.desiredMoveInDate ? new Date(data.desiredMoveInDate) : null,
    mustHave: data.mustHave || null,
    niceToHave: data.niceToHave || null,
    commuteMemo: data.commuteMemo || null,
  };

  const saved = await prisma.propertyPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...values },
    update: values,
  });

  return NextResponse.json(saved);
}
