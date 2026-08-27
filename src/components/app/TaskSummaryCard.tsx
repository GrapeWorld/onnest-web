import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { actionItemPriorityLabels, type ActionItemPriority } from "@/data/actionItem";
import type { ActionItemSummaryEntry } from "@/lib/actionItemQueries";

/**
 * 알림(읽었는지)과 절대 섞지 않는다 — "처리할 업무 N건"만 보여준다.
 * /my·/partner·/admin 각 홈 화면 상단에 붙이는 공용 요약 카드.
 */
export function TaskSummaryCard({
  count,
  items,
  emptyMessage,
}: {
  count: number;
  items: ActionItemSummaryEntry[];
  emptyMessage: string;
}) {
  return (
    <Card>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-forest">처리할 업무 {count}건</h2>
        {count > 0 && (
          <Link href="/tasks" className="text-sm font-semibold text-forest hover:underline">
            전체 보기 →
          </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink/55">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.internalPath}
                className="flex items-start justify-between gap-3 rounded-2xl border border-forest/10 px-4 py-3 hover:border-forest/30 hover:bg-cream"
              >
                <div className="min-w-0">
                  <p className="break-words font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 break-words text-sm text-ink/60">{item.description}</p>
                </div>
                {item.priority !== "NORMAL" && (
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold",
                      item.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-cream text-forest",
                    )}
                  >
                    {actionItemPriorityLabels[item.priority as ActionItemPriority]}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
