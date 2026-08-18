import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { escapeHtml, notifyServiceRequestCustomer } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { serviceRequestCancelledStatus } from "@/data/serviceRequests";

const schema = z.object({
  reason: z.string().trim().min(1, "내부 사유를 입력해주세요.").max(500),
});

/**
 * 관리자 전용 — 업체 연결이 어려운 신청에 대해 내부 사유를 기록하고, 고객에게는
 * 그 사유를 그대로 노출하지 않고 항상 고정된 안전한 문구로만 안내 메일을
 * 보낸다. status 자체는 바꾸지 않는다(계속 배정을 시도할 수 있으므로).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { reason } = parsed.data;

  let result: {
    error: "notfound" | "terminal" | null;
    success?: { serviceType: string; projectId: string; customer: { email: string; name: string | null } };
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceRequest.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          serviceType: true,
          projectId: true,
          project: { select: { user: { select: { email: true, name: true } } } },
        },
      });
      if (!existing) return { error: "notfound" as const };
      if (existing.status === "작업 완료" || existing.status === serviceRequestCancelledStatus) {
        return { error: "terminal" as const };
      }

      await tx.serviceRequest.update({
        where: { id },
        data: { noPartnerReason: reason, noPartnerNoticeSentAt: new Date() },
      });
      await tx.serviceRequestActivity.create({
        data: {
          serviceRequestId: id,
          action: "NO_PARTNER_NOTICE",
          note: reason,
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: "ADMIN",
        },
      });

      return {
        error: null,
        success: {
          serviceType: existing.serviceType,
          projectId: existing.projectId,
          customer: existing.project.user,
        },
      };
    }, { isolationLevel: "Serializable" });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json({ error: "신청을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "terminal") {
    return NextResponse.json(
      { error: "이미 완료되었거나 취소된 신청에는 안내를 보낼 수 없습니다." },
      { status: 400 },
    );
  }

  const { serviceType, projectId, customer } = result.success!;

  try {
    const servicesUrl = new URL(`/projects/${projectId}/services`, getAppUrl()).toString();
    await notifyServiceRequestCustomer({
      to: customer.email,
      subject: `[ONNEST] ${escapeHtml(serviceType)} 서비스 연결 안내`,
      html: `
        <p>신청해주신 ${escapeHtml(serviceType)} 서비스는 현재 연결 가능한 업체를 찾는 데 시간이 걸리고 있습니다.</p>
        <p>계속 확인 중이며, 연결되는 대로 다시 안내드립니다. 다른 서비스 유형으로 다시 신청하시거나 궁금하신 점은 문의를 남겨주세요.</p>
        <p><a href="${servicesUrl}">신청 내역에서 확인하기</a></p>
      `,
    });
  } catch (error) {
    console.error("[email] no-partner notice failed", error);
  }

  return NextResponse.json({ id });
}
