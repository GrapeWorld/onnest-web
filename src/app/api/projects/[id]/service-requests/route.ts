import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { serviceRequestSchema } from "@/lib/serviceRequestSchema";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { escapeHtml, notifyAdmin } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

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
    select: { id: true, name: true },
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

  // 알림 발송(또는 그 URL 조립)이 실패해도 이미 저장된 신청 응답은 막지 않는다.
  try {
    const adminUrl = new URL("/admin/service-leads", getAppUrl()).toString();
    await notifyAdmin({
      subject: `[ONNEST] 신규 서비스 연결 신청: ${escapeHtml(project.name)}`,
      html: `
        <p>새 서비스 연결 신청이 접수됐습니다.</p>
        <ul>
          <li>프로젝트: ${escapeHtml(project.name)}</li>
          <li>신청 유형: ${uniqueTypes.map((type) => escapeHtml(type)).join(", ")}</li>
          <li>담당자: ${escapeHtml(contactName)}</li>
          <li>연락처: ${escapeHtml(contactPhone)}</li>
        </ul>
        <p><a href="${adminUrl}">관리자 페이지에서 확인하기</a></p>
      `,
    });
  } catch (error) {
    console.error("[email] service request admin notification failed", error);
  }

  return NextResponse.json({ created: uniqueTypes.length }, { status: 201 });
}
