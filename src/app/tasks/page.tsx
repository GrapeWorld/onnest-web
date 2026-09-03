import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/cn";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  actionItemOpenStatuses,
  actionItemRoleContextLabels,
  actionItemPriorityLabels,
  type ActionItemRoleContext,
  type ActionItemPriority,
} from "@/data/actionItem";

const timeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

/**
 * 고객·업체·관리자 공용 할 일 목록. 알림함(/notifications)과 같은 원칙 —
 * 역할을 여러 개 가진 계정도 한 곳에서 다 본다. 여기서 "완료" 버튼을
 * 누르는 기능은 의도적으로 없다 — 실제 업무가 처리돼야만(서버가
 * sourceKey로 찾아) 닫힌다. 사용자가 버튼으로 서버 상태를 우회해 완료
 * 처리하지 못하게 막는 원칙이다.
 */
export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { filter } = await searchParams;
  const showClosed = filter === "done";

  const items = await prisma.actionItem.findMany({
    where: {
      assigneeUserId: user.id,
      status: showClosed ? { notIn: actionItemOpenStatuses } : { in: actionItemOpenStatuses },
    },
    orderBy: showClosed ? { updatedAt: "desc" } : [{ priority: "desc" }, { createdAt: "asc" }],
    take: 100,
  });

  return (
    <CustomerAppShell
      title="할 일"
      description="지금 처리해야 하는 업무를 모아 확인합니다. 알림(읽었는지)과는 별개로, 실제 업무가 처리되면 자동으로 닫힙니다."
    >
      <div className="mb-6 flex gap-2">
        <Link
          href="/tasks"
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold",
            !showClosed ? "bg-forest text-white" : "bg-white text-forest shadow-card",
          )}
        >
          처리할 업무
        </Link>
        <Link
          href="/tasks?filter=done"
          className={cn(
            "rounded-full px-4 py-2 text-sm font-semibold",
            showClosed ? "bg-forest text-white" : "bg-white text-forest shadow-card",
          )}
        >
          완료·취소
        </Link>
      </div>

      {items.length === 0 ? (
        <p className="rounded-[24px] border border-forest/10 bg-white p-8 text-center text-sm text-ink/50">
          {showClosed ? "완료·취소된 업무가 없습니다." : "처리할 업무가 없습니다."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <Card className="w-full p-0">
                <Link
                  href={item.internalPath}
                  className="flex w-full flex-col gap-1 rounded-[24px] p-5 text-left"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-cream px-2.5 py-0.5 text-xs font-semibold text-forest">
                      {actionItemRoleContextLabels[item.roleContext as ActionItemRoleContext]}
                    </span>
                    {item.priority !== "NORMAL" && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-bold",
                          item.priority === "URGENT" ? "bg-red-100 text-red-700" : "bg-mint text-forest",
                        )}
                      >
                        {actionItemPriorityLabels[item.priority as ActionItemPriority]}
                      </span>
                    )}
                    {showClosed && (
                      <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-semibold text-ink/60">
                        {item.status === "COMPLETED" ? "완료" : "취소"}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-ink">{item.title}</span>
                  <span className="break-words text-sm text-ink/60">{item.description}</span>
                  <span className="text-xs text-ink/40">{timeFormatter.format(item.createdAt)}</span>
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </CustomerAppShell>
  );
}
