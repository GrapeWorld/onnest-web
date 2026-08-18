import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { fetchStaticMapImage } from "@/lib/naverMap";

/**
 * 정지 이미지 지도를 대신 요청해 그대로 흘려보낸다. NCP 인증 헤더는
 * 서버에서만 붙이므로 클라이언트는 이 응답(이미지 바이트)만 받고 키를
 * 보지 못한다. 좌표도 클라이언트가 임의로 넘기지 않고, 소유권이 확인된
 * candidateId로 DB에 캐시된 값만 쓴다 — 그렇지 않으면 이 라우트가 남이
 * 쓸 수 있는 익명 지도 프록시가 되어 API 사용량을 낭비할 수 있다.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const property = await prisma.candidateProperty.findFirst({
    where: { id, userId: user.id },
    select: { latitude: true, longitude: true },
  });
  if (!property) {
    return NextResponse.json({ error: "매물 후보를 찾을 수 없습니다." }, { status: 404 });
  }
  if (property.latitude == null || property.longitude == null) {
    return NextResponse.json({ error: "이 매물의 지도를 아직 표시할 수 없습니다." }, { status: 404 });
  }

  const image = await fetchStaticMapImage({ lat: property.latitude, lng: property.longitude });
  if (!image) {
    return NextResponse.json({ error: "지도를 가져오지 못했습니다." }, { status: 502 });
  }

  return new NextResponse(image.body as unknown as BodyInit, {
    headers: {
      "Content-Type": image.contentType,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
