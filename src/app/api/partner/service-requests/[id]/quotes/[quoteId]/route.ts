import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership, evaluateServiceRequestWriteAccess } from "@/lib/partnerAuth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { isQuoteMutableStatus } from "@/lib/serviceRequestQuotes";

/** 업체 포털 — 미선택 견적만 삭제 가능. 고객이 선택한 견적, 잠긴 상태의 요청은 거부. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; quoteId: string }> },
) {
  const user = await getCurrentUser();
  const membership = user ? await getActiveMembership(user) : null;
  if (!user || !membership) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const limit = await checkRateLimit("partnerRequestQuote", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const { id, quoteId } = await params;

  let result: {
    error: "notfound" | "forbidden" | "locked" | "quote-notfound" | "selected" | null;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.serviceRequest.findUnique({
        where: { id },
        select: { id: true, partnerId: true, partnerStaffId: true, status: true, selectedQuoteId: true },
      });
      if (!existing) return { error: "notfound" as const };
      const permission = evaluateServiceRequestWriteAccess(membership, user.id, existing);
      if (!permission.ok) return { error: permission.reason };
      if (!isQuoteMutableStatus(existing.status)) {
        return { error: "locked" as const };
      }

      const quote = await tx.serviceRequestQuote.findFirst({
        where: { id: quoteId, serviceRequestId: id },
        select: { id: true, title: true, amount: true },
      });
      if (!quote) {
        return { error: "quote-notfound" as const };
      }
      if (existing.selectedQuoteId === quoteId) {
        return { error: "selected" as const };
      }

      await tx.serviceRequestQuote.delete({ where: { id: quoteId } });
      await tx.serviceRequestActivity.create({
        data: {
          serviceRequestId: id,
          action: "QUOTE_REMOVED",
          changes: { quoteId: quote.id, title: quote.title, amount: quote.amount },
          actorId: user.id,
          actorEmail: user.email,
          actorName: user.name,
          actorRole: "PARTNER",
          partnerId: user.partnerId,
        },
      });
      return { error: null };
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
  if (result.error === "forbidden") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (result.error === "locked") {
    return NextResponse.json({ error: "이 상태에서는 견적을 삭제할 수 없습니다." }, { status: 400 });
  }
  if (result.error === "quote-notfound") {
    return NextResponse.json({ error: "견적을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "selected") {
    return NextResponse.json(
      { error: "고객이 선택한 견적은 삭제할 수 없습니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: quoteId });
}
