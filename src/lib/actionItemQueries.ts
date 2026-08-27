import { prisma } from "@/lib/prisma";
import { actionItemOpenStatuses } from "@/data/actionItem";
import type { ActionItemRoleContext } from "@/data/actionItem";

export type ActionItemSummaryEntry = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  internalPath: string;
  createdAt: Date;
};

/** 알림 요약과 마찬가지로, 이 조회가 실패해도 페이지 전체가 죽으면 안 된다. */
export async function getOpenActionItemSummary(
  userId: string,
  roleContext?: ActionItemRoleContext,
): Promise<{ count: number; items: ActionItemSummaryEntry[] }> {
  try {
    const where = {
      assigneeUserId: userId,
      status: { in: actionItemOpenStatuses },
      ...(roleContext ? { roleContext } : {}),
    };
    const [count, items] = await Promise.all([
      prisma.actionItem.count({ where }),
      prisma.actionItem.findMany({
        where,
        orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
        take: 5,
        select: {
          id: true,
          type: true,
          title: true,
          description: true,
          priority: true,
          status: true,
          internalPath: true,
          createdAt: true,
        },
      }),
    ]);
    return { count, items };
  } catch (error) {
    console.error("[action-items] summary query failed", error);
    return { count: 0, items: [] };
  }
}
