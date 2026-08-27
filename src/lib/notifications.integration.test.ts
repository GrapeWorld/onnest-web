import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createNotification, createNotifications } from "@/lib/notifications";

/**
 * 실제(테스트 전용) DB를 쓴다 — dedupeKey 중복 방지는 (recipientUserId,
 * dedupeKey) 유니크 제약과 upsert/createMany+skipDuplicates의 실제 동작에
 * 의존하므로 mock으로는 의미 있게 검증할 수 없다.
 */

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `notification-test-${randomUUID()}@example.com`,
      name: "테스트 사용자",
    },
  });
}

describe("createNotification (integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("dedupeKey가 없으면 매번 새 행을 만든다", async () => {
    const user = await createTestUser();
    await createNotification(prisma, {
      recipientUserId: user.id,
      type: "MEMBER_STATUS_CHANGED",
      title: "제목1",
      body: "본문1",
      internalPath: "/my",
    });
    await createNotification(prisma, {
      recipientUserId: user.id,
      type: "MEMBER_STATUS_CHANGED",
      title: "제목2",
      body: "본문2",
      internalPath: "/my",
    });
    const count = await prisma.notification.count({ where: { recipientUserId: user.id } });
    expect(count).toBe(2);
  });

  it("같은 dedupeKey로 두 번 호출해도 한 행만 남는다(원래 내용을 유지한다)", async () => {
    const user = await createTestUser();
    const dedupeKey = `TEST:${user.id}`;
    await createNotification(prisma, {
      recipientUserId: user.id,
      type: "SERVICE_REQUEST_COMPLETED",
      title: "최초 제목",
      body: "최초 본문",
      internalPath: "/my/service-requests",
      dedupeKey,
    });
    await createNotification(prisma, {
      recipientUserId: user.id,
      type: "SERVICE_REQUEST_COMPLETED",
      title: "재시도 제목",
      body: "재시도 본문",
      internalPath: "/my/service-requests",
      dedupeKey,
    });
    const rows = await prisma.notification.findMany({ where: { recipientUserId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("최초 제목");
  });

  it("같은 dedupeKey를 트랜잭션 안에서 두 번 호출해도 한 행만 남고 트랜잭션은 실패하지 않는다", async () => {
    const user = await createTestUser();
    const dedupeKey = `TEST-TX:${user.id}`;
    await prisma.$transaction(async (tx) => {
      await createNotification(tx, {
        recipientUserId: user.id,
        type: "SERVICE_REQUEST_COMPLETED",
        title: "트랜잭션 알림",
        body: "본문",
        internalPath: "/my/service-requests",
        dedupeKey,
      });
      await createNotification(tx, {
        recipientUserId: user.id,
        type: "SERVICE_REQUEST_COMPLETED",
        title: "트랜잭션 알림(재시도)",
        body: "본문",
        internalPath: "/my/service-requests",
        dedupeKey,
      });
    });
    const rows = await prisma.notification.findMany({ where: { recipientUserId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("트랜잭션 알림");
  });

  it("서로 다른 수신자는 같은 dedupeKey를 각자 하나씩 가질 수 있다", async () => {
    const dedupeKey = `TEST-FANOUT:${randomUUID()}`;
    const [userA, userB] = await Promise.all([createTestUser(), createTestUser()]);
    await createNotifications(prisma, [
      {
        recipientUserId: userA.id,
        type: "ADMIN_NEW_SERVICE_REQUEST",
        title: "신규 서비스 신청",
        body: "본문",
        internalPath: "/admin/service-leads",
        dedupeKey,
      },
      {
        recipientUserId: userB.id,
        type: "ADMIN_NEW_SERVICE_REQUEST",
        title: "신규 서비스 신청",
        body: "본문",
        internalPath: "/admin/service-leads",
        dedupeKey,
      },
    ]);
    // 재시도(같은 dedupeKey로 다시 fan-out)해도 각자 한 행만 유지한다.
    await createNotifications(prisma, [
      {
        recipientUserId: userA.id,
        type: "ADMIN_NEW_SERVICE_REQUEST",
        title: "신규 서비스 신청(재시도)",
        body: "본문",
        internalPath: "/admin/service-leads",
        dedupeKey,
      },
      {
        recipientUserId: userB.id,
        type: "ADMIN_NEW_SERVICE_REQUEST",
        title: "신규 서비스 신청(재시도)",
        body: "본문",
        internalPath: "/admin/service-leads",
        dedupeKey,
      },
    ]);
    const [countA, countB] = await Promise.all([
      prisma.notification.count({ where: { recipientUserId: userA.id, dedupeKey } }),
      prisma.notification.count({ where: { recipientUserId: userB.id, dedupeKey } }),
    ]);
    expect(countA).toBe(1);
    expect(countB).toBe(1);
  });
});
