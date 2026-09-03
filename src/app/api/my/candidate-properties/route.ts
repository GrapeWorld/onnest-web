import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { candidatePropertySchema } from "@/lib/candidatePropertySchema";
import { geocodeAddress } from "@/lib/naverMap";

/** 내 관심 매물 목록. 본인 것만 돌려준다. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const properties = await prisma.candidateProperty.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(properties);
}

/** 관심 매물 등록. 서버는 sourceUrl을 절대 요청(fetch)하지 않고 입력값만 그대로 저장한다. */
export async function POST(request: Request) {
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
  const parsed = candidatePropertySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const duplicate = await prisma.candidateProperty.findFirst({
    where: { userId: user.id, sourceUrl: data.sourceUrl },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "이미 등록된 매물 URL입니다.", existingCandidatePropertyId: duplicate.id },
      { status: 409 },
    );
  }

  // 관리자가 공유한 매물(ProjectPropertySuggestion)을 이 폼으로 저장하는
  // 경우에만 검증한다 — 해당 고객 소유 프로젝트의 공유 건인지, 이미 저장된
  // 적은 없는지 확인한다.
  if (data.suggestionId) {
    const suggestion = await prisma.projectPropertySuggestion.findFirst({
      where: { id: data.suggestionId, project: { userId: user.id }, withdrawnAt: null },
      select: { id: true, savedCandidatePropertyId: true },
    });
    if (!suggestion) {
      return NextResponse.json({ error: "공유된 매물을 찾을 수 없습니다." }, { status: 404 });
    }
    if (suggestion.savedCandidatePropertyId) {
      return NextResponse.json({ error: "이미 매물 후보로 저장된 공유입니다." }, { status: 409 });
    }
  }

  const created = await prisma.candidateProperty.create({
    data: {
      userId: user.id,
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
      memo: data.memo || null,
      advantages: data.advantages || null,
      concerns: data.concerns || null,
      status: data.status || "관심",
    },
  });

  // 주소가 있으면 좌표를 미리 조회해 캐시해둔다. 지도 API 미설정·실패는
  // geocodeAddress가 항상 null로 삼키므로, 이 단계가 실패해도 위의 등록
  // 자체는 이미 끝난 상태다(응답은 항상 성공을 반영). geocodeAddress는
  // 저장 이후에 실행되는 부가 작업이라 응답이 돌아올 때까지 시간이 걸릴
  // 수 있다 — 그 사이 사용자가 바로 이어서 주소를 수정하면(PATCH가 먼저
  // 끝나고 새 주소로 다시 지오코딩을 시작한 뒤에) 이 오래된 조회 결과가
  // 나중에 도착해 새 좌표를 덮어쓸 수 있다. update 대신 조건부 updateMany로
  // "그 사이 주소가 안 바뀌었을 때만" 반영하고, count가 0이면(주소가
  // 이미 바뀐 것) 오류가 아니라 오래된 결과를 그냥 버린다.
  if (data.address) {
    try {
      const coordinates = await geocodeAddress(data.address);
      if (coordinates) {
        await prisma.candidateProperty.updateMany({
          where: { id: created.id, address: data.address },
          data: { latitude: coordinates.lat, longitude: coordinates.lng },
        });
      }
    } catch (error) {
      console.error("[naver-map] failed to cache coordinates on create", error);
    }
  }

  if (data.suggestionId) {
    await prisma.projectPropertySuggestion.update({
      where: { id: data.suggestionId },
      data: { customerStatus: "SAVED", savedCandidatePropertyId: created.id, respondedAt: new Date() },
    });
  }

  return NextResponse.json({ id: created.id }, { status: 201 });
}
