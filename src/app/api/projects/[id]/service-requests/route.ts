import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serviceRequestSchema } from "@/lib/serviceRequestSchema";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";

/** 서비스 연결 신청. 선택한 유형마다 한 건씩 만든다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  // 로그인이 필요한 요청이므로 IP 대신 계정 기준으로 센다.
  const limit = await checkRateLimit("serviceRequest", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `신청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = serviceRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const {
    serviceTypes: selected,
    preferredDate,
    region,
    message,
    contactName,
    contactPhone,
  } = parsed.data;

  // 같은 유형을 두 번 보내도 한 건만 만들어지게 중복을 제거한다.
  const uniqueTypes = [...new Set(selected)];
  // agreePrivacy는 스키마에서 true만 통과하므로 여기 도달하면 동의한 것이다.
  const privacyAgreedAt = new Date();

  await prisma.serviceRequest.createMany({
    data: uniqueTypes.map((serviceType) => ({
      projectId: id,
      serviceType,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      region,
      message: message || null,
      contactName,
      contactPhone,
      privacyAgreedAt,
    })),
  });

  return NextResponse.json({ created: uniqueTypes.length }, { status: 201 });
}
