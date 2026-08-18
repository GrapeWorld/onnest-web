import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { propertyVisitChecklistItems } from "@/data/candidateProperty";

const bodySchema = z.object({ label: z.string(), checked: z.boolean() });

/**
 * 방문 체크리스트 항목 하나를 켜고 끈다. ProjectCheckItem의 upsert 패턴과
 * 같다 — label은 고정 목록에 있는 값만 허용해 임의 문자열 저장을 막는다.
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !propertyVisitChecklistItems.includes(parsed.data.label as never)) {
    return NextResponse.json({ error: "잘못된 체크 항목입니다." }, { status: 400 });
  }

  const { id } = await params;
  const property = await prisma.candidateProperty.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!property) {
    return NextResponse.json({ error: "매물 후보를 찾을 수 없습니다." }, { status: 404 });
  }

  const { label, checked } = parsed.data;
  await prisma.propertyVisitCheckItem.upsert({
    where: {
      candidatePropertyId_label: { candidatePropertyId: id, label },
    },
    create: { candidatePropertyId: id, label, checked },
    update: { checked },
  });

  return NextResponse.json({ label, checked });
}
