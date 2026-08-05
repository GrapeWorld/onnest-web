import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isPartnerStaff } from "@/lib/partnerAuth";
import { isQuoteMutableStatus } from "@/lib/serviceRequestQuotes";
import { escapeHtml, notifyServiceRequestCustomer } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

const quoteCreateSchema = z.object({
  title: z.string().trim().min(1, "견적 이름을 입력해주세요.").max(100),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  amount: z
    .number({ error: "금액을 숫자로 입력해주세요." })
    .int("금액은 정수(원)로 입력해주세요.")
    .positive("금액은 0보다 커야 합니다.")
    .max(1_000_000_000, "금액은 10억 원을 넘을 수 없습니다."),
});

/** 업체 포털 — 배정된 요청에 견적 옵션을 등록한다. 여러 개를 등록해 고객이 비교하게 한다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isPartnerStaff(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = quoteCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;

  let result: {
    error: "notfound" | "locked" | null;
    success?: {
      quote: { id: string; title: string; description: string | null; amount: number; createdAt: Date };
      customer: { email: string; name: string } | null;
      serviceType: string;
      projectId: string;
    };
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceRequest.findUnique({
        where: { id },
        select: {
          id: true,
          partnerId: true,
          status: true,
          serviceType: true,
          project: { select: { id: true, user: { select: { email: true, name: true } } } },
        },
      });
      if (!existing || existing.partnerId !== user.partnerId) {
        return { error: "notfound" as const };
      }
      if (!isQuoteMutableStatus(existing.status)) {
        return { error: "locked" as const };
      }

      const quote = await tx.serviceRequestQuote.create({
        data: {
          serviceRequestId: id,
          title: parsed.data.title,
          description: parsed.data.description || null,
          amount: parsed.data.amount,
          createdById: user.id,
          createdByName: user.name,
        },
        select: { id: true, title: true, description: true, amount: true, createdAt: true },
      });
      await tx.serviceRequestActivity.create({
        data: {
          serviceRequestId: id,
          action: "QUOTE_ADDED",
          changes: { quoteId: quote.id, title: quote.title, amount: quote.amount },
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: "PARTNER",
        },
      });
      return {
        error: null,
        success: {
          quote,
          customer: existing.project.user,
          serviceType: existing.serviceType,
          projectId: existing.project.id,
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
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "locked") {
    return NextResponse.json(
      { error: "이 상태에서는 새 견적을 등록할 수 없습니다." },
      { status: 400 },
    );
  }

  if (!result.success) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }
  const { quote, customer, serviceType, projectId } = result.success;

  if (customer) {
    try {
      const servicesUrl = new URL(`/projects/${projectId}/services`, getAppUrl()).toString();
      await notifyServiceRequestCustomer({
        to: customer.email,
        subject: `[ONNEST] ${escapeHtml(serviceType)} 서비스에 새 견적이 도착했습니다`,
        html: `
          <p>안녕하세요, ${escapeHtml(customer.name)}님.</p>
          <p>신청하신 ${escapeHtml(serviceType)} 서비스에 새 견적이 등록됐습니다.</p>
          <p>로그인 후 신청 내역에서 견적을 비교하고 선택해주세요.</p>
          <p><a href="${servicesUrl}">${servicesUrl}</a></p>
        `,
      });
    } catch (error) {
      console.error("[email] service request quote customer notification failed", error);
    }
  }

  return NextResponse.json(quote, { status: 201 });
}
