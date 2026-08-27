import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  getCurrentUser: vi.fn(),
  inquiryCreate: vi.fn(),
  activityCreate: vi.fn(),
  userFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
  transaction: vi.fn(),
  notifyAdmin: vi.fn(),
  notifyInquiryCustomer: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    inquiry: { create: mocks.inquiryCreate },
    inquiryActivity: { create: mocks.activityCreate },
    user: { findMany: mocks.userFindMany },
    notification: { createMany: mocks.notificationCreateMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyAdmin: mocks.notifyAdmin,
  notifyInquiryCustomer: mocks.notifyInquiryCustomer,
}));

import { POST } from "@/app/api/inquiries/route";

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: "홍길동",
    email: "user@example.com",
    phone: "010-1234-5678",
    type: "개인 고객 문의",
    message: "입주 관련해서 문의드립니다.",
    agreePrivacy: true,
    ...overrides,
  };
}

function call(body: unknown) {
  const request = new Request("http://localhost/api/inquiries", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/inquiries", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.getCurrentUser.mockResolvedValue(null);
    mocks.inquiryCreate.mockResolvedValue({
      id: "inquiry-1",
      name: "홍길동",
      email: "user@example.com",
      phone: "010-1234-5678",
      type: "개인 고객 문의",
      region: null,
      spaceType: null,
      message: "입주 관련해서 문의드립니다.",
      organization: null,
    });
    mocks.activityCreate.mockResolvedValue({});
    mocks.userFindMany.mockResolvedValue([{ id: "admin-1", adminRole: "super" }]);
    mocks.notificationCreateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        inquiry: { create: mocks.inquiryCreate },
        inquiryActivity: { create: mocks.activityCreate },
        user: { findMany: mocks.userFindMany },
        notification: { createMany: mocks.notificationCreateMany },
      }),
    );
    mocks.notifyAdmin.mockResolvedValue(undefined);
    mocks.notifyInquiryCustomer.mockResolvedValue(undefined);
  });

  it("creates the inquiry, its CREATED activity, and notifies the admin", async () => {
    const response = await call(baseInput());

    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.inquiryCreate).toHaveBeenCalledTimes(1);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inquiryId: "inquiry-1",
        action: "CREATED",
      }),
    });
    // 공개 접수는 actor 정보가 전혀 없어야 한다 — 사용자가 임의로 지정할 방법이 없다.
    expect(mocks.activityCreate.mock.calls[0][0].data.actorId).toBeUndefined();
    expect(mocks.notifyAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.notifyAdmin.mock.calls[0][0].subject).toContain("홍길동");
  });

  it("does not link userId when submitted while logged out", async () => {
    await call(baseInput());

    expect(mocks.inquiryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: null }),
    });
  });

  it("links userId immediately when submitted while logged in", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });

    await call(baseInput());

    expect(mocks.inquiryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1" }),
    });
  });

  it("sends a submission-confirmation email to the customer", async () => {
    await call(baseInput());

    expect(mocks.notifyInquiryCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" }),
    );
  });

  it("does not notify when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 30 });

    const response = await call(baseInput());

    expect(response.status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notifyAdmin).not.toHaveBeenCalled();
    expect(mocks.notifyInquiryCustomer).not.toHaveBeenCalled();
  });

  it("does not notify when validation fails", async () => {
    const response = await call(baseInput({ email: "not-an-email" }));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.notifyAdmin).not.toHaveBeenCalled();
  });

  it("still returns 201 when the notification fails", async () => {
    mocks.notifyAdmin.mockRejectedValue(new Error("resend down"));

    const response = await call(baseInput());
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.id).toBe("inquiry-1");
  });
});
