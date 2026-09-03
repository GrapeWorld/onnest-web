import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { NotificationListItem } from "@/components/app/NotificationListItem";
import { MarkAllNotificationsReadButton } from "@/components/app/MarkAllNotificationsReadButton";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationCategory } from "@/data/notification";

/**
 * 고객·업체·관리자 공용 알림함. 역할별로 페이지를 나누지 않는다 — 한
 * 사람이 동시에 여러 역할(예: 관리자이면서 고객)을 가질 수 있어 알림도
 * 한 곳에서 다 봐야 한다. 역할·권한에 따른 구분은 각 알림의 category와
 * internalPath로만 표현한다.
 */
export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { filter } = await searchParams;
  const unreadOnly = filter === "unread";

  const notifications = await prisma.notification.findMany({
    where: { recipientUserId: user.id, ...(unreadOnly ? { readAt: null } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      body: true,
      category: true,
      internalPath: true,
      readAt: true,
      createdAt: true,
    },
  });

  return (
    <CustomerAppShell
      title="알림"
      description="서비스 이용 중 발생한 소식을 모아 확인합니다."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <Link
            href="/notifications"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              !unreadOnly ? "bg-forest text-white" : "bg-white text-forest shadow-card",
            )}
          >
            전체
          </Link>
          <Link
            href="/notifications?filter=unread"
            className={cn(
              "rounded-full px-4 py-2 text-sm font-semibold",
              unreadOnly ? "bg-forest text-white" : "bg-white text-forest shadow-card",
            )}
          >
            안읽음
          </Link>
        </div>
        <MarkAllNotificationsReadButton />
      </div>

      {notifications.length === 0 ? (
        <p className="rounded-[24px] border border-forest/10 bg-white p-8 text-center text-sm text-ink/50">
          {unreadOnly ? "안읽은 알림이 없습니다." : "알림이 없습니다."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notifications.map((notification) => (
            <NotificationListItem
              key={notification.id}
              item={{ ...notification, category: notification.category as NotificationCategory }}
            />
          ))}
        </ul>
      )}
    </CustomerAppShell>
  );
}
