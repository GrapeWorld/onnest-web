import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  actionItemFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    actionItem: { findMany: mocks.actionItemFindMany },
    notification: { createMany: mocks.notificationCreateMany },
  },
}));
// @/lib/notifications가 @/lib/auth를 거쳐 session.ts를 불러오는데, 이
// 라우트는 인증 흐름을 쓰지 않으니(내부 크론 전용) SESSION_SECRET 없이도
// 모듈 로드가 실패하지 않게 최소한으로 목만 둔다.
vi.mock("@/lib/auth", () => ({ isAdmin: () => false }));

import { GET } from "@/app/api/cron/action-item-deadlines/route";

function call(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return GET(new Request("http://localhost/api/cron/action-item-deadlines", { headers }));
}

const NOW = new Date("2026-08-10T00:00:00.000Z");
const days = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

function item(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "ai-1",
    title: "작업 완료를 등록해주세요",
    internalPath: "/partner/requests/req-1",
    dueAt: days(0),
    assigneeUserId: "user-1",
    assignee: { status: "ACTIVE" },
    ...overrides,
  };
}

describe("GET /api/cron/action-item-deadlines", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.CRON_SECRET = "test-secret";
    mocks.actionItemFindMany.mockResolvedValue([]);
    mocks.notificationCreateMany.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("rejects requests with no authorization header", async () => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(mocks.actionItemFindMany).not.toHaveBeenCalled();
  });

  it("rejects requests with the wrong secret", async () => {
    const response = await call("Bearer wrong-secret");
    expect(response.status).toBe(401);
  });

  it("rejects every request when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const response = await call("Bearer test-secret");
    expect(response.status).toBe(401);
  });

  it("queries only open items with a due date", async () => {
    await call("Bearer test-secret");
    expect(mocks.actionItemFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["PENDING", "IN_PROGRESS"] }, dueAt: { not: null } },
      }),
    );
  });

  it("does nothing when nothing is due soon or overdue", async () => {
    mocks.actionItemFindMany.mockResolvedValue([item({ dueAt: days(10) })]);
    const response = await call("Bearer test-secret");
    const data = await response.json();
    expect(data).toEqual({ checked: 1, dueSoon: 0, overdue: 0 });
    expect(mocks.notificationCreateMany).not.toHaveBeenCalled();
  });

  it("notifies for items due soon (D-1 이내)", async () => {
    mocks.actionItemFindMany.mockResolvedValue([item({ dueAt: days(1) })]);
    const response = await call("Bearer test-secret");
    const data = await response.json();
    expect(data).toEqual({ checked: 1, dueSoon: 1, overdue: 0 });
    expect(mocks.notificationCreateMany).toHaveBeenCalledTimes(1);
    const rows = mocks.notificationCreateMany.mock.calls[0][0].data;
    expect(rows).toHaveLength(1);
    expect(rows[0].type).toBe("ACTION_ITEM_DUE_SOON");
    expect(rows[0].recipientUserId).toBe("user-1");
  });

  it("notifies for overdue items", async () => {
    mocks.actionItemFindMany.mockResolvedValue([item({ id: "ai-2", dueAt: days(-3) })]);
    const response = await call("Bearer test-secret");
    const data = await response.json();
    expect(data).toEqual({ checked: 1, dueSoon: 0, overdue: 1 });
    const rows = mocks.notificationCreateMany.mock.calls[0][0].data;
    expect(rows[0].type).toBe("ACTION_ITEM_OVERDUE");
  });

  it("skips assignees whose account is suspended/withdrawn/blocked", async () => {
    mocks.actionItemFindMany.mockResolvedValue([
      item({ id: "ai-3", dueAt: days(-1), assignee: { status: "SUSPENDED" } }),
    ]);
    const response = await call("Bearer test-secret");
    const data = await response.json();
    expect(data).toEqual({ checked: 1, dueSoon: 0, overdue: 0 });
    expect(mocks.notificationCreateMany).not.toHaveBeenCalled();
  });

  it("dedupe key includes today's date so re-runs the same day don't duplicate", async () => {
    mocks.actionItemFindMany.mockResolvedValue([item({ dueAt: days(0) })]);
    await call("Bearer test-secret");
    const rows = mocks.notificationCreateMany.mock.calls[0][0].data;
    expect(rows[0].dedupeKey).toBe("action-item-due-soon:ai-1:2026-08-10");
  });
});
