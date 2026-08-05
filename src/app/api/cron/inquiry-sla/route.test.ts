import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  inquiryFindMany: vi.fn(),
  notifyAdmin: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { inquiry: { findMany: mocks.inquiryFindMany } },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyAdmin: mocks.notifyAdmin,
}));
vi.mock("@/lib/appUrl", () => ({
  getAppUrl: () => "https://app.example.com",
}));

import { GET } from "@/app/api/cron/inquiry-sla/route";

function call(authorization?: string) {
  const headers = new Headers();
  if (authorization) headers.set("authorization", authorization);
  return GET(new Request("http://localhost/api/cron/inquiry-sla", { headers }));
}

const NOW = new Date("2026-08-10T00:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("GET /api/cron/inquiry-sla", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    process.env.CRON_SECRET = "test-secret";
    mocks.inquiryFindMany.mockResolvedValue([]);
    mocks.notifyAdmin.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CRON_SECRET;
  });

  it("rejects requests with no authorization header", async () => {
    const response = await call();
    expect(response.status).toBe(401);
    expect(mocks.inquiryFindMany).not.toHaveBeenCalled();
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

  it("queries only open statuses", async () => {
    await call("Bearer test-secret");

    expect(mocks.inquiryFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: { in: ["신규", "검토 중", "파트너 배정"] } },
      }),
    );
  });

  it("does not notify when nothing is overdue", async () => {
    mocks.inquiryFindMany.mockResolvedValue([
      { id: "i1", name: "고객1", type: "서비스 이용 문의", status: "검토 중", assigneeId: "admin-1", createdAt: daysAgo(1) },
    ]);

    const response = await call("Bearer test-secret");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ checked: 1, warnings: 0 });
    expect(mocks.notifyAdmin).not.toHaveBeenCalled();
  });

  it("notifies with a digest listing overdue inquiries", async () => {
    mocks.inquiryFindMany.mockResolvedValue([
      { id: "i1", name: "고객1", type: "서비스 이용 문의", status: "신규", assigneeId: null, createdAt: daysAgo(5) },
      { id: "i2", name: "고객2", type: "개인 고객 문의", status: "검토 중", assigneeId: "admin-1", createdAt: daysAgo(1) },
    ]);

    const response = await call("Bearer test-secret");
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ checked: 2, warnings: 1 });
    expect(mocks.notifyAdmin).toHaveBeenCalledTimes(1);
    const html = mocks.notifyAdmin.mock.calls[0][0].html;
    expect(html).toContain("고객1");
    expect(html).not.toContain("고객2");
  });
});
