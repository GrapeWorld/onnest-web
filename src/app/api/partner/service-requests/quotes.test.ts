import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  quoteCreate: vi.fn(),
  activityCreate: vi.fn(),
  notificationUpsert: vi.fn(),
  actionItemUpdateMany: vi.fn(),
  actionItemUpsert: vi.fn(),
  transaction: vi.fn(),
  notifyServiceRequestCustomer: vi.fn(),
  membershipFindFirst: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.findUnique },
    serviceRequestQuote: { create: mocks.quoteCreate },
    serviceRequestActivity: { create: mocks.activityCreate },
    notification: { upsert: mocks.notificationUpsert },
    actionItem: { updateMany: mocks.actionItemUpdateMany, upsert: mocks.actionItemUpsert },
    partnerMembership: { findFirst: mocks.membershipFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyServiceRequestCustomer: mocks.notifyServiceRequestCustomer,
}));
vi.mock("@/lib/appUrl", () => ({
  getAppUrl: () => "https://app.example.com",
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));

import { POST } from "@/app/api/partner/service-requests/[id]/quotes/route";

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/partner/service-requests/${id}/quotes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/partner/service-requests/[id]/quotes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-1",
      email: "staff@partner.example.com",
      name: "김직원",
      memberType: "PARTNER",
      partnerId: "partner-1",
      status: "ACTIVE",
    });
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: null,
      status: "신규",
      serviceType: "이사",
      project: { id: "project-1", user: { id: "customer-1", email: "customer@example.com", name: "고객" } },
    });
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "OWNER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.quoteCreate.mockResolvedValue({
      id: "quote-1",
      title: "기본형",
      description: null,
      amount: 500000,
      createdAt: new Date(),
    });
    mocks.activityCreate.mockResolvedValue({});
    mocks.notificationUpsert.mockResolvedValue({});
    mocks.actionItemUpdateMany.mockResolvedValue({ count: 0 });
    mocks.actionItemUpsert.mockResolvedValue({});
    mocks.notifyServiceRequestCustomer.mockResolvedValue(undefined);
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findUnique: mocks.findUnique },
        serviceRequestQuote: { create: mocks.quoteCreate },
        serviceRequestActivity: { create: mocks.activityCreate },
        notification: { upsert: mocks.notificationUpsert },
    actionItem: { updateMany: mocks.actionItemUpdateMany, upsert: mocks.actionItemUpsert },
      }),
    );
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await call({ title: "기본형", amount: 500000 });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty title", async () => {
    const response = await call({ title: "", amount: 500000 });
    expect(response.status).toBe(400);
  });

  it("rejects a non-integer amount", async () => {
    const response = await call({ title: "기본형", amount: 500000.5 });
    expect(response.status).toBe(400);
  });

  it("rejects a zero or negative amount", async () => {
    const response = await call({ title: "기본형", amount: 0 });
    expect(response.status).toBe(400);
  });

  it("rejects an amount over the cap", async () => {
    const response = await call({ title: "기본형", amount: 1_000_000_001 });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a request belonging to a different partner", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "other-partner",
      status: "신규",
      serviceType: "이사",
      project: { id: "project-1", user: { id: "customer-1", email: "customer@example.com", name: "고객" } },
    });

    const response = await call({ title: "기본형", amount: 500000 });
    expect(response.status).toBe(404);
  });

  it("returns 404 for a missing request", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await call({ title: "기본형", amount: 500000 });
    expect(response.status).toBe(404);
  });

  it("rejects a VIEWER with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "VIEWER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await call({ title: "기본형", amount: 500000 });
    expect(response.status).toBe(403);
    expect(mocks.quoteCreate).not.toHaveBeenCalled();
  });

  it("hides an unassigned STAFF's access as 404 (not their request)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
      status: "신규",
      serviceType: "이사",
      project: { id: "project-1", user: { id: "customer-1", email: "customer@example.com", name: "고객" } },
    });

    const response = await call({ title: "기본형", amount: 500000 });
    expect(response.status).toBe(404);
    expect(mocks.quoteCreate).not.toHaveBeenCalled();
  });

  it("blocks adding a quote once the status is locked", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      status: "작업 예정",
      serviceType: "이사",
      project: { id: "project-1", user: { id: "customer-1", email: "customer@example.com", name: "고객" } },
    });

    const response = await call({ title: "기본형", amount: 500000 });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이 상태에서는 새 견적을 등록할 수 없습니다.");
    expect(mocks.quoteCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call({ title: "기본형", amount: 500000 });

    expect(response.status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates a quote and logs a QUOTE_ADDED activity", async () => {
    const response = await call({ title: "기본형", description: "기본 청소", amount: 500000 });

    expect(response.status).toBe(201);
    expect(mocks.quoteCreate).toHaveBeenCalledWith({
      data: {
        serviceRequestId: "request-1",
        title: "기본형",
        description: "기본 청소",
        amount: 500000,
        createdById: "staff-1",
        createdByName: "김직원",
      },
      select: { id: true, title: true, description: true, amount: true, createdAt: true },
    });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceRequestId: "request-1",
        action: "QUOTE_ADDED",
        changes: { quoteId: "quote-1", title: "기본형", amount: 500000 },
        actorRole: "PARTNER",
        partnerId: "partner-1",
      }),
    });
  });

  it("notifies the project owner by email", async () => {
    await call({ title: "기본형", amount: 500000 });

    expect(mocks.notifyServiceRequestCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "customer@example.com" }),
    );
  });

  it("still returns 201 when the customer notification fails", async () => {
    mocks.notifyServiceRequestCustomer.mockRejectedValue(new Error("resend down"));

    const response = await call({ title: "기본형", amount: 500000 });

    expect(response.status).toBe(201);
  });

  it("returns 409 on a concurrent-conflict transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ title: "기본형", amount: 500000 });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.");
  });

  it("runs inside a Serializable transaction", async () => {
    await call({ title: "기본형", amount: 500000 });

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
