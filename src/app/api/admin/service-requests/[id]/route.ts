import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { serviceRequestPatchSchema } from "@/lib/serviceRequestSchema";
import { escapeHtml, notifyPartnerStaff } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

/** 관리자 전용 상태·담당자·업체 배정 변경 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = serviceRequestPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const existing = await prisma.serviceRequest.findUnique({
    where: { id },
    select: { id: true, serviceType: true, status: true, partnerId: true },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "신청을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (parsed.data.partnerId) {
    const partner = await prisma.partner.findUnique({
      where: { id: parsed.data.partnerId },
      select: { active: true, serviceType: true },
    });
    if (!partner || !partner.active || partner.serviceType !== existing.serviceType) {
      return NextResponse.json(
        { error: "배정할 수 없는 업체입니다." },
        { status: 400 },
      );
    }
  }

  const data: typeof parsed.data & { selectedQuoteId?: null; selectedAt?: null } = {
    ...parsed.data,
  };

  // 이전에 배정되지 않았던(또는 다른) 업체가 새로 배정되면 상태를 그 업체
  // 큐의 시작점인 "신규"로 되돌린다 — 다른 업체를 다시 시도하는 정상적인
  // 흐름이라 "취소"였던 건도 리셋된다. 다만 이미 "작업 완료"된 신청은
  // 되돌리지 않는다.
  const isNewPartnerAssignment =
    parsed.data.partnerId != null && parsed.data.partnerId !== existing.partnerId;
  if (isNewPartnerAssignment && existing.status !== "작업 완료") {
    data.status = "신규";
  }

  // 업체가 바뀌거나(재배정) 해제되면 이전 업체의 견적이 그대로 남아있지
  // 않도록 정리한다 — 새로 배정된 업체 포털에 이전 업체의 가격이 그대로
  // 보이는 유출을 막는다. partnerId 필드 자체를 안 보낸 요청(상태·담당자만
  // 바꾸는 경우)은 건드리지 않는다.
  const partnerChanged =
    parsed.data.partnerId !== undefined && parsed.data.partnerId !== existing.partnerId;
  if (partnerChanged) {
    data.selectedQuoteId = null;
    data.selectedAt = null;
  }

  const updated = await prisma.serviceRequest.update({
    where: { id },
    data,
    select: { id: true, status: true, owner: true, partnerId: true },
  });

  if (partnerChanged) {
    await prisma.serviceRequestQuote.deleteMany({ where: { serviceRequestId: id } });
  }

  // 새 업체가 배정되면 그 업체의 활성 직원 전원에게 알린다(아직 담당
  // 직원이 지정되지 않은 시점이라 특정 1인에게 보낼 수 없다 — 담당 직원
  // 지정은 업체 포털에서 이후에 한다). 알림 발송(또는 URL 조립) 실패가
  // 이미 저장된 배정 응답을 막지 않는다.
  if (isNewPartnerAssignment) {
    try {
      const staff = await prisma.user.findMany({
        where: { partnerId: parsed.data.partnerId!, memberType: "PARTNER", status: "ACTIVE" },
        select: { email: true },
      });
      const portalUrl = new URL(
        `/partner/requests/${id}`,
        getAppUrl(),
      ).toString();
      await notifyPartnerStaff({
        to: staff.map((member) => member.email),
        subject: "[ONNEST] 새 서비스 요청이 배정되었습니다",
        html: `
          <p>새 서비스 요청이 배정되었습니다.</p>
          <ul>
            <li>서비스 유형: ${escapeHtml(existing.serviceType)}</li>
          </ul>
          <p><a href="${portalUrl}">업체 포털에서 확인하기</a></p>
        `,
      });
    } catch (error) {
      console.error("[email] service request assignment notification failed", error);
    }
  }

  return NextResponse.json(updated);
}
