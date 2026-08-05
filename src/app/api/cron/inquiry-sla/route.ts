import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { escapeHtml, notifyAdmin } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { getInquiryWarning, openInquiryStatuses, type InquiryWarning } from "@/lib/inquirySla";

// Vercel Cron이 CRON_SECRET을 Authorization: Bearer 헤더로 자동 첨부한다.
// 값이 없거나 일치하지 않으면 무조건 거부한다 — CRON_SECRET 미설정을
// "인증 생략"으로 취급하지 않는다(다른 알림들과 달리 이 엔드포인트는
// 외부에서 트리거 가능한 GET이라 기본값이 열려 있으면 안 된다).
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const openInquiries = await prisma.inquiry.findMany({
    where: { status: { in: openInquiryStatuses } },
    select: { id: true, name: true, type: true, status: true, assigneeId: true, createdAt: true },
  });

  type Overdue = { inquiry: (typeof openInquiries)[number]; warning: InquiryWarning };
  const overdue = openInquiries
    .map((inquiry) => ({ inquiry, warning: getInquiryWarning(inquiry) }))
    .filter((entry): entry is Overdue => entry.warning !== null);

  if (overdue.length === 0) {
    return NextResponse.json({ checked: openInquiries.length, warnings: 0 });
  }

  const inquiriesUrl = new URL("/admin/inquiries", getAppUrl()).toString();
  const rows = overdue
    .map(({ inquiry, warning }) => {
      const reasons = [
        warning.unassigned && "미배정",
        warning.unreviewed && "미검토",
      ].filter(Boolean);
      const detailUrl = new URL(`/admin/inquiries/${inquiry.id}`, getAppUrl()).toString();
      return `<li><a href="${detailUrl}">${escapeHtml(inquiry.name)} · ${escapeHtml(inquiry.type)}</a> — ${reasons.join("·")} (${warning.daysOpen}일째)</li>`;
    })
    .join("");

  await notifyAdmin({
    subject: `[ONNEST] 지연된 문의 ${overdue.length}건`,
    html: `
      <p>접수 후 일정 기간 방치된 문의가 있습니다.</p>
      <ul>${rows}</ul>
      <p><a href="${inquiriesUrl}">문의 접수함에서 확인하기</a></p>
    `,
  });

  return NextResponse.json({ checked: openInquiries.length, warnings: overdue.length });
}
