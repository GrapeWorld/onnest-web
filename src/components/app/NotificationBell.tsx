"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { markNotificationRead, formatNotificationTime } from "@/lib/notificationClient";

export type NotificationPreviewItem = {
  id: string;
  title: string;
  body: string;
  internalPath: string;
  readAt: Date | null;
  createdAt: Date;
};

export function NotificationBell({
  initialUnreadCount,
  initialRecent,
}: {
  initialUnreadCount: number;
  initialRecent: NotificationPreviewItem[];
}) {
  // unreadCount·items는 로컬 state로 미러링하지 않고 항상 props를 그대로
  // 쓴다 — 클릭하면 곧장 다른 페이지로 이동하므로(router.push), 그 다음
  // 페이지의 Header가 서버에서 새로 뱃지 수를 계산해 보여준다. 미러링하면
  // "모두 읽음" 같은 다른 화면에서의 변경이 router.refresh() 후에도 반영되지
  // 않는 문제가 생긴다(같은 위치의 클라이언트 컴포넌트 인스턴스는 재사용돼
  // useState 초기값이 다시 평가되지 않는다).
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  async function handleItemClick(item: NotificationPreviewItem) {
    setOpen(false);
    const result = await markNotificationRead(item.id);
    router.push(result?.redirectTo ?? "/notifications");
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={initialUnreadCount > 0 ? `알림 ${initialUnreadCount}개 안읽음` : "알림"}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-forest/15 text-forest hover:border-forest/40"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {initialUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest px-1 text-[10px] font-semibold text-white">
            {initialUnreadCount > 9 ? "9+" : initialUnreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="최근 알림"
          className="absolute right-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-[20px] border border-forest/10 bg-white p-2 shadow-soft"
        >
          {initialRecent.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-ink/50">알림이 없습니다.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {initialRecent.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-2xl px-3 py-2 text-left hover:bg-cream",
                      !item.readAt && "bg-mint/40",
                    )}
                  >
                    <span className="text-sm font-semibold text-ink">{item.title}</span>
                    <span className="line-clamp-2 text-xs text-ink/60">{item.body}</span>
                    <span className="text-[11px] text-ink/40">{formatNotificationTime(item.createdAt)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="/notifications"
            onClick={() => setOpen(false)}
            className="mt-1 block rounded-2xl px-3 py-2 text-center text-sm font-semibold text-forest hover:bg-cream"
          >
            전체 알림 보기
          </Link>
        </div>
      )}
    </div>
  );
}
