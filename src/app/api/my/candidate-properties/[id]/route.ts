import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { candidatePropertySchema } from "@/lib/candidatePropertySchema";
import { geocodeAddress } from "@/lib/naverMap";

const candidatePropertyUpdateSchema = candidatePropertySchema.partial();

/** 관심 매물 수정. 본인 소유가 아니면(또는 없으면) 존재 여부를 노출하지 않고 같은 404를 돌려준다. */
export async function PATCH(
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
  const parsed = candidatePropertyUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const data = parsed.data;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.candidateProperty.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true, address: true },
    });
    if (!existing) return null;

    // 다른 상태 → "최종 후보"로 바뀌는 시점에만 selectedAt을 새로 찍는다.
    const nextStatus = data.status ?? existing.status;
    const justSelected = nextStatus === "최종 후보" && existing.status !== "최종 후보";

    // 주소가 실제로 바뀔 때만 좌표를 다시 조회한다 — 메모 등 무관한 필드
    // 수정마다 지도 API를 다시 부르지 않기 위해서다. 주소를 지우면 캐시된
    // 좌표도 함께 지운다(옛 주소의 지도가 남아 보이지 않게).
    const newAddress = data.address !== undefined ? data.address || null : undefined;
    const addressChanged = newAddress !== undefined && newAddress !== existing.address;

    const updated = await tx.candidateProperty.update({
      where: { id },
      data: {
        ...(data.sourceUrl !== undefined ? { sourceUrl: data.sourceUrl } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(newAddress !== undefined ? { address: newAddress } : {}),
        ...(data.transactionType !== undefined ? { transactionType: data.transactionType || null } : {}),
        ...(data.price !== undefined ? { price: data.price ?? null } : {}),
        ...(data.deposit !== undefined ? { deposit: data.deposit ?? null } : {}),
        ...(data.monthlyRent !== undefined ? { monthlyRent: data.monthlyRent ?? null } : {}),
        ...(data.area !== undefined ? { area: data.area ?? null } : {}),
        ...(data.roomCount !== undefined ? { roomCount: data.roomCount ?? null } : {}),
        ...(data.availableDate !== undefined
          ? { availableDate: data.availableDate ? new Date(data.availableDate) : null }
          : {}),
        ...(data.memo !== undefined ? { memo: data.memo || null } : {}),
        ...(data.advantages !== undefined ? { advantages: data.advantages || null } : {}),
        ...(data.concerns !== undefined ? { concerns: data.concerns || null } : {}),
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(justSelected ? { selectedAt: new Date() } : {}),
        ...(addressChanged ? { latitude: null, longitude: null } : {}),
      },
      select: { id: true },
    });

    return { updated, addressChanged, newAddress };
  }, { isolationLevel: "Serializable" });

  if (!result) {
    return NextResponse.json({ error: "매물 후보를 찾을 수 없습니다." }, { status: 404 });
  }

  const { updated, addressChanged, newAddress } = result;

  if (addressChanged && newAddress) {
    try {
      const coordinates = await geocodeAddress(newAddress);
      if (coordinates) {
        await prisma.candidateProperty.update({
          where: { id },
          data: { latitude: coordinates.lat, longitude: coordinates.lng },
        });
      }
    } catch (error) {
      console.error("[naver-map] failed to cache coordinates on update", error);
    }
  }

  return NextResponse.json(updated);
}

/** 관심 매물 삭제. 실제 프로젝트로 연결된 기록도 삭제할 수 있다 — 연결된 Project는 SetNull로 보존된다. */
export async function DELETE(
  _request: Request,
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

  const { id } = await params;
  const existing = await prisma.candidateProperty.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "매물 후보를 찾을 수 없습니다." }, { status: 404 });
  }

  await prisma.candidateProperty.delete({ where: { id } });

  return NextResponse.json({ id });
}
