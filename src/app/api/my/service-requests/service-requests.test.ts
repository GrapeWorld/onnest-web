import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  quoteFindFirst: vi.fn(),
  update: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
  userFindMany: vi.fn(),
  membershipFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
  actionItemUpdateMany: vi.fn(),
  notifyPartnerStaff: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findFirst: mocks.findFirst, update: mocks.update },
    serviceRequestQuote: { findFirst: mocks.quoteFindFirst },
    serviceRequestActivity: { create: mocks.activityCreate },
    user: { findMany: mocks.userFindMany },
    partnerMembership: { findMany: mocks.membershipFindMany },
    notification: { createMany: mocks.notificationCreateMany },
    actionItem: { updateMany: mocks.actionItemUpdateMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyPartnerStaff: mocks.notifyPartnerStaff,
}));
vi.mock("@/lib/appUrl", () => ({
  getAppUrl: () => "https://app.example.com",
}));

import { PATCH } from "@/app/api/my/service-requests/[id]/route";

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/my/service-requests/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/my/service-requests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      name: "홍길동",
    });
    mocks.findFirst.mockResolvedValue({
      id: "request-1",
      status: "신규",
      selectedQuoteId: null,
      partnerId: "partner-1",
      partnerStaffId: null,
    });
    mocks.quoteFindFirst.mockResolvedValue({ id: "quote-1", title: "기본형", amount: 500000 });
    mocks.update.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.userFindMany.mockResolvedValue([{ email: "staff@partner.example.com" }]);
    mocks.membershipFindMany.mockResolvedValue([{ userId: "owner-1", role: "OWNER" }]);
    mocks.notificationCreateMany.mockResolvedValue({ count: 1 });
    mocks.actionItemUpdateMany.mockResolvedValue({ count: 0 });
    mocks.notifyPartnerStaff.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findFirst: mocks.findFirst, update: mocks.update },
        serviceRequestQuote: { findFirst: mocks.quoteFindFirst },
        serviceRequestActivity: { create: mocks.activityCreate },
        partnerMembership: { findMany: mocks.membershipFindMany },
        notification: { createMany: mocks.notificationCreateMany },
    actionItem: { updateMany: mocks.actionItemUpdateMany },
      }),
    );
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ quoteId: "quote-1" });
    expect(response.status).toBe(401);
  });

  it("rejects a missing quoteId", async () => {
    const response = await call({ quoteId: "" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a request not owned by this customer (existence hidden)", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await call({ quoteId: "quote-1" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("요청을 찾을 수 없습니다.");
  });

  it("blocks selecting once the status is locked", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "request-1",
      status: "작업 예정",
      selectedQuoteId: null,
      partnerId: "partner-1",
    });

    const response = await call({ quoteId: "quote-1" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("지금은 견적을 선택할 수 없습니다.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 for a quote that doesn't belong to this request", async () => {
    mocks.quoteFindFirst.mockResolvedValue(null);

    const response = await call({ quoteId: "missing" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("견적을 찾을 수 없습니다.");
  });

  it("rejects re-selecting the same quote", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "request-1",
      status: "신규",
      selectedQuoteId: "quote-1",
      partnerId: "partner-1",
    });

    const response = await call({ quoteId: "quote-1" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 선택한 견적입니다.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("selects a quote and logs a QUOTE_SELECTED activity", async () => {
    const response = await call({ quoteId: "quote-1" });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { selectedQuoteId: "quote-1", selectedAt: expect.any(Date) },
    });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceRequestId: "request-1",
        action: "QUOTE_SELECTED",
        changes: {
          quoteId: "quote-1",
          title: "기본형",
          amount: 500000,
          previousQuoteId: null,
        },
        actorId: "user-1",
        actorRole: "CUSTOMER",
        partnerId: "partner-1",
      }),
    });
  });

  it("notifies the assigned partner's active staff", async () => {
    await call({ quoteId: "quote-1" });

    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: { partnerId: "partner-1", memberType: "PARTNER", status: "ACTIVE" },
      select: { email: true },
    });
    expect(mocks.notifyPartnerStaff).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["staff@partner.example.com"] }),
    );
  });

  it("does not notify anyone when the request has no assigned partner", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "request-1",
      status: "신규",
      selectedQuoteId: null,
      partnerId: null,
    });

    await call({ quoteId: "quote-1" });

    expect(mocks.notifyPartnerStaff).not.toHaveBeenCalled();
  });

  it("still returns 200 when the notification fails", async () => {
    mocks.notifyPartnerStaff.mockRejectedValue(new Error("resend down"));

    const response = await call({ quoteId: "quote-1" });

    expect(response.status).toBe(200);
  });

  it("returns 409 on a concurrent-conflict transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ quoteId: "quote-1" });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.");
  });

  it("runs inside a Serializable transaction", async () => {
    await call({ quoteId: "quote-1" });

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
