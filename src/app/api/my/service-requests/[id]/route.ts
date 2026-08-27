import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isQuoteMutableStatus } from "@/lib/serviceRequestQuotes";
import { escapeHtml, notifyPartnerStaff } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { formatWon } from "@/lib/currency";
import { createNotifications } from "@/lib/notifications";
import { getReadablePartnerRequestRecipients } from "@/lib/serviceRequestNotifications";
import { resolveActionItemsBySourceKey } from "@/lib/actionItems";

const selectQuoteSchema = z.object({
  quoteId: z.string().min(1, "선택할 견적을 확인해주세요."),
});

/** 고객 — 자신의 서비스 신청에 도착한 견적 중 하나를 선택(또는 변경)한다. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = selectQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { quoteId } = parsed.data;

  let result: {
    error: "notfound" | "locked" | "quote-notfound" | "same" | null;
    success?: { partnerId: string | null; title: string; amount: number };
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceRequest.findFirst({
        where: { id, project: { userId: user.id } },
        select: { id: true, status: true, selectedQuoteId: true, partnerId: true, partnerStaffId: true },
      });
      if (!existing) return { error: "notfound" as const };
      if (!isQuoteMutableStatus(existing.status)) return { error: "locked" as const };

      const quote = await tx.serviceRequestQuote.findFirst({
        where: { id: quoteId, serviceRequestId: id },
        select: { id: true, title: true, amount: true },
      });
      if (!quote) return { error: "quote-notfound" as const };
      if (existing.selectedQuoteId === quoteId) return { error: "same" as const };

      await tx.serviceRequest.update({
        where: { id },
        data: { selectedQuoteId: quoteId, selectedAt: new Date() },
      });
      await tx.serviceRequestActivity.create({
        data: {
          serviceRequestId: id,
          action: "QUOTE_SELECTED",
          changes: {
            quoteId: quote.id,
            title: quote.title,
            amount: quote.amount,
            previousQuoteId: existing.selectedQuoteId,
          },
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: "CUSTOMER",
          partnerId: existing.partnerId,
        },
      });

      if (existing.partnerId) {
        const recipients = await getReadablePartnerRequestRecipients(
          tx,
          existing.partnerId,
          existing.partnerStaffId,
        );
        await createNotifications(
          tx,
          recipients.map((recipientUserId) => ({
            recipientUserId,
            type: "PARTNER_QUOTE_SELECTED" as const,
            title: "고객이 견적을 선택했습니다",
            body: `${quote.title} (${formatWon(quote.amount)}원)을 선택했습니다.`,
            internalPath: `/partner/requests/${id}`,
            dedupeKey: `PARTNER_QUOTE_SELECTED:${quoteId}`,
          })),
        );
      }

      await resolveActionItemsBySourceKey(tx, `CUSTOMER_SELECT_QUOTE:${id}`, "COMPLETED");

      return {
        error: null,
        success: { partnerId: existing.partnerId, title: quote.title, amount: quote.amount },
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
    return NextResponse.json({ error: "지금은 견적을 선택할 수 없습니다." }, { status: 400 });
  }
  if (result.error === "quote-notfound") {
    return NextResponse.json({ error: "견적을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "same") {
    return NextResponse.json({ error: "이미 선택한 견적입니다." }, { status: 400 });
  }

  if (!result.success) {
    return NextResponse.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }
  const { partnerId, title, amount } = result.success;

  if (partnerId) {
    try {
      const staff = await prisma.user.findMany({
        where: { partnerId, memberType: "PARTNER", status: "ACTIVE" },
        select: { email: true },
      });
      const portalUrl = new URL(`/partner/requests/${id}`, getAppUrl()).toString();
      await notifyPartnerStaff({
        to: staff.map((member) => member.email),
        subject: "[ONNEST] 고객이 견적을 선택했습니다",
        html: `
          <p>고객이 견적을 선택했습니다.</p>
          <ul><li>선택한 견적: ${escapeHtml(title)} (${formatWon(amount)}원)</li></ul>
          <p><a href="${portalUrl}">업체 포털에서 확인하기</a></p>
        `,
      });
    } catch (error) {
      console.error("[email] service request quote selection notification failed", error);
    }
  }

  return NextResponse.json({ id, selectedQuoteId: quoteId });
}
