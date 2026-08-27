import type { Prisma, PrismaClient } from "@prisma/client";
import type { ActionItemType, ActionItemPriority } from "@/data/actionItem";
import { actionItemTypeRoleContext, actionItemOpenStatuses } from "@/data/actionItem";

type Db = PrismaClient | Prisma.TransactionClient;

export type ActionItemInput = {
  assigneeUserId: string;
  type: ActionItemType;
  title: string;
  description: string;
  internalPath: string;
  relatedEntityType: string;
  relatedEntityId: string;
  /** 같은 업무가 다시 만들어지지 않게 막는 키. 이 업무가 실제로 처리되면 같은 키로 전체를 닫는다. */
  sourceKey: string;
  priority?: ActionItemPriority;
  dueAt?: Date;
};

/**
 * 할 일 하나를 만든다. Notification과 같은 원칙 — (assigneeUserId,
 * sourceKey) 유니크 제약을 이용한 upsert로 중복 생성을 막는다(create 후
 * P2002를 catch하는 방식은 쓰지 않는다).
 */
export async function createActionItem(db: Db, input: ActionItemInput) {
  const data = {
    assigneeUserId: input.assigneeUserId,
    roleContext: actionItemTypeRoleContext[input.type],
    type: input.type,
    title: input.title,
    description: input.description,
    priority: input.priority ?? "NORMAL",
    internalPath: input.internalPath,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    sourceKey: input.sourceKey,
    dueAt: input.dueAt ?? null,
  };
  return db.actionItem.upsert({
    where: {
      assigneeUserId_sourceKey: { assigneeUserId: input.assigneeUserId, sourceKey: input.sourceKey },
    },
    update: {},
    create: data,
  });
}

/** 여러 담당자에게 같은 업무를 팬아웃한다(예: 새 신청 확인을 업체 대표+매니저 전원에게). */
export async function createActionItems(db: Db, inputs: ActionItemInput[]) {
  if (inputs.length === 0) return;
  const rows = inputs.map((input) => ({
    assigneeUserId: input.assigneeUserId,
    roleContext: actionItemTypeRoleContext[input.type],
    type: input.type,
    title: input.title,
    description: input.description,
    priority: input.priority ?? "NORMAL",
    internalPath: input.internalPath,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    sourceKey: input.sourceKey,
    dueAt: input.dueAt ?? null,
  }));
  await db.actionItem.createMany({ data: rows, skipDuplicates: true });
}

/**
 * 이 sourceKey로 만들어진, 아직 열려 있는(PENDING/IN_PROGRESS) 할 일을
 * 전부 찾아 닫는다 — 수신자가 몇 명이었든 관련 업무가 실제로 처리되면
 * 한 번에 정리된다. 완료(실제로 끝남)와 취소(더는 할 필요 없어짐)를
 * 구분한다.
 */
export async function resolveActionItemsBySourceKey(
  db: Db,
  sourceKey: string,
  outcome: "COMPLETED" | "CANCELLED",
) {
  const now = new Date();
  await db.actionItem.updateMany({
    where: { sourceKey, status: { in: actionItemOpenStatuses } },
    data:
      outcome === "COMPLETED"
        ? { status: "COMPLETED", completedAt: now }
        : { status: "CANCELLED", cancelledAt: now },
  });
}
