"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { markNotificationRead, formatNotificationTime } from "@/lib/notificationClient";
import { notificationCategoryLabels, type NotificationCategory } from "@/data/notification";

export type NotificationListItemData = {
  id: string;
  title: string;
  body: string;
  category: NotificationCategory;
  internalPath: string;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationListItem({ item }: { item: NotificationListItemData }) {
  // item.readAt(서버 값)을 그대로 진실로 쓴다 — 로컬 state로 미러링하면
  // "모두 읽음" 처리 후 router.refresh()로 새 props가 내려와도(같은 key라
  // 컴포넌트 인스턴스가 재사용되므로) 화면이 갱신되지 않는 버그가 생긴다.
  const [pending, setPending] = useState(false);
  const router = useRouter();

  async function handleClick() {
    if (pending) return;
    setPending(true);
    const result = await markNotificationRead(item.id);
    setPending(false);
    router.push(result?.redirectTo ?? "/notifications");
  }

  return (
    <li>
      <Card className={cn("w-full p-0", !item.readAt && "border-forest/30")}>
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          data-notification-id={item.id}
          data-notification-read={item.readAt ? "true" : "false"}
          className="flex w-full flex-col gap-1 rounded-[24px] p-5 text-left disabled:opacity-70"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-forest">
              {notificationCategoryLabels[item.category]}
            </span>
            {!item.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-forest" aria-label="안읽음" />}
          </div>
          <span className="font-semibold text-ink">{item.title}</span>
          <span className="text-sm text-ink/60">{item.body}</span>
          <span className="text-xs text-ink/40">{formatNotificationTime(item.createdAt)}</span>
        </button>
      </Card>
    </li>
  );
}
