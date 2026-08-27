import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createActionItem, createActionItems, resolveActionItemsBySourceKey } from "@/lib/actionItems";

async function createTestUser() {
  return prisma.user.create({
    data: { email: `action-item-test-${randomUUID()}@example.com`, name: "테스트 사용자" },
  });
}

describe("actionItems (integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("같은 sourceKey로 두 번 만들어도 한 건만 남는다", async () => {
    const user = await createTestUser();
    const sourceKey = `TEST:${user.id}`;
    await createActionItem(prisma, {
      assigneeUserId: user.id,
      type: "PARTNER_CONFIRM_NEW_REQUEST",
      title: "최초",
      description: "설명",
      internalPath: "/partner",
      relatedEntityType: "ServiceRequest",
      relatedEntityId: "req-1",
      sourceKey,
    });
    await createActionItem(prisma, {
      assigneeUserId: user.id,
      type: "PARTNER_CONFIRM_NEW_REQUEST",
      title: "재시도",
      description: "설명",
      internalPath: "/partner",
      relatedEntityType: "ServiceRequest",
      relatedEntityId: "req-1",
      sourceKey,
    });
    const rows = await prisma.actionItem.findMany({ where: { assigneeUserId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("최초");
    expect(rows[0].status).toBe("PENDING");
  });

  it("여러 수신자에게 팬아웃한 뒤 sourceKey로 한 번에 전부 완료 처리한다", async () => {
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);
    const sourceKey = `TEST-FANOUT:${randomUUID()}`;
    await createActionItems(prisma, [
      {
        assigneeUserId: userA.id,
        type: "PARTNER_REGISTER_QUOTE",
        title: "견적 등록",
        description: "설명",
        internalPath: "/partner",
        relatedEntityType: "ServiceRequest",
        relatedEntityId: "req-2",
        sourceKey,
      },
      {
        assigneeUserId: userB.id,
        type: "PARTNER_REGISTER_QUOTE",
        title: "견적 등록",
        description: "설명",
        internalPath: "/partner",
        relatedEntityType: "ServiceRequest",
        relatedEntityId: "req-2",
        sourceKey,
      },
    ]);

    await resolveActionItemsBySourceKey(prisma, sourceKey, "COMPLETED");

    const [rowA, rowB] = await Promise.all([
      prisma.actionItem.findFirstOrThrow({ where: { assigneeUserId: userA.id, sourceKey } }),
      prisma.actionItem.findFirstOrThrow({ where: { assigneeUserId: userB.id, sourceKey } }),
    ]);
    expect(rowA.status).toBe("COMPLETED");
    expect(rowA.completedAt).not.toBeNull();
    expect(rowB.status).toBe("COMPLETED");
  });

  it("이미 완료·취소된 항목은 resolveActionItemsBySourceKey가 다시 건드리지 않는다", async () => {
    const user = await createTestUser();
    const sourceKey = `TEST-ALREADY:${user.id}`;
    const created = await createActionItem(prisma, {
      assigneeUserId: user.id,
      type: "ADMIN_ANSWER_INQUIRY",
      title: "문의 답변",
      description: "설명",
      internalPath: "/admin/inquiries",
      relatedEntityType: "Inquiry",
      relatedEntityId: "inq-1",
      sourceKey,
    });
    await resolveActionItemsBySourceKey(prisma, sourceKey, "CANCELLED");
    const cancelled = await prisma.actionItem.findUniqueOrThrow({ where: { id: created.id } });
    expect(cancelled.status).toBe("CANCELLED");
    const cancelledAt = cancelled.cancelledAt;

    await resolveActionItemsBySourceKey(prisma, sourceKey, "COMPLETED");
    const stillCancelled = await prisma.actionItem.findUniqueOrThrow({ where: { id: created.id } });
    expect(stillCancelled.status).toBe("CANCELLED");
    expect(stillCancelled.cancelledAt).toEqual(cancelledAt);
  });
});
