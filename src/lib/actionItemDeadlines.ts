import { daysUntil, todayInSeoul } from "@/lib/dates";

/** dueAt이 있는 할 일을 마감 며칠 전부터 미리 알릴지. */
export const ACTION_ITEM_DUE_SOON_DAYS = 1;

export type ActionItemDeadlineWarning = "DUE_SOON" | "OVERDUE";

/**
 * dueAt이 있는 열린("내가 할 일") 항목 하나가 지금 알림 대상인지 판단한다.
 * 마감을 이미 넘겼으면 매일 다시 OVERDUE, 마감이 임박했으면(D-1 이내)
 * 한 번 DUE_SOON, 그 밖(아직 여유 있음)에는 null.
 */
export function getActionItemDeadlineWarning(
  dueAt: Date,
  today: Date = todayInSeoul(),
): ActionItemDeadlineWarning | null {
  const days = daysUntil(dueAt, today);
  if (days < 0) return "OVERDUE";
  if (days <= ACTION_ITEM_DUE_SOON_DAYS) return "DUE_SOON";
  return null;
}
