import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotifications } from "@/lib/notifications";
import { getActionItemDeadlineWarning } from "@/lib/actionItemDeadlines";
import { actionItemOpenStatuses } from "@/data/actionItem";
import { loginBlockedStatuses } from "@/data/memberStatus";
import { todayInSeoul, formatDate } from "@/lib/dates";

// inquiry-sla와 같은 인증 원칙 — CRON_SECRET 미설정을 "인증 생략"으로
// 취급하지 않는다.
function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * dueAt이 걸린 열린 "내가 할 일"을 매일 훑어 마감 임박(D-1 이내)·마감
 * 초과 알림을 보낸다. 완료·취소된 할 일은 애초에 status 필터로 제외되고,
 * 재배정으로 닫힌 이전 담당자의 항목도 같은 이유로 제외된다. 로그인이
 * 막힌(정지·탈퇴·영구제한) 담당자에게는 보내지 않는다.
 */
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
  }

  const today = todayInSeoul();
  const dayStamp = today.toISOString().slice(0, 10);

  const openItems = await prisma.actionItem.findMany({
    where: { status: { in: actionItemOpenStatuses }, dueAt: { not: null } },
    select: {
      id: true,
      title: true,
      internalPath: true,
      dueAt: true,
      assigneeUserId: true,
      assignee: { select: { status: true } },
    },
  });

  const dueSoon: typeof openItems = [];
  const overdue: typeof openItems = [];
  for (const item of openItems) {
    if (!item.dueAt) continue;
    if (loginBlockedStatuses.includes(item.assignee.status as (typeof loginBlockedStatuses)[number])) continue;
    const warning = getActionItemDeadlineWarning(item.dueAt, today);
    if (warning === "DUE_SOON") dueSoon.push(item);
    else if (warning === "OVERDUE") overdue.push(item);
  }

  await createNotifications(prisma, [
    ...dueSoon.map((item) => ({
      recipientUserId: item.assigneeUserId,
      type: "ACTION_ITEM_DUE_SOON" as const,
      title: `마감이 다가옵니다: ${item.title}`,
      body: `${formatDate(item.dueAt!)}까지 처리해주세요.`,
      internalPath: item.internalPath,
      dedupeKey: `action-item-due-soon:${item.id}:${dayStamp}`,
    })),
    ...overdue.map((item) => ({
      recipientUserId: item.assigneeUserId,
      type: "ACTION_ITEM_OVERDUE" as const,
      title: `마감이 지났습니다: ${item.title}`,
      body: `예정일(${formatDate(item.dueAt!)})이 지났습니다. 빠르게 확인해주세요.`,
      internalPath: item.internalPath,
      dedupeKey: `action-item-overdue:${item.id}:${dayStamp}`,
    })),
  ]);

  return NextResponse.json({
    checked: openItems.length,
    dueSoon: dueSoon.length,
    overdue: overdue.length,
  });
}
