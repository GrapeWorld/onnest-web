import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  quoteFindFirst: vi.fn(),
  quoteDelete: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.findUnique },
    serviceRequestQuote: { findFirst: mocks.quoteFindFirst, delete: mocks.quoteDelete },
    serviceRequestActivity: { create: mocks.activityCreate },
    $transaction: mocks.transaction,
  },
}));

import { DELETE } from "@/app/api/partner/service-requests/[id]/quotes/[quoteId]/route";

function call(id = "request-1", quoteId = "quote-1") {
  const request = new Request(
    `http://localhost/api/partner/service-requests/${id}/quotes/${quoteId}`,
    { method: "DELETE" },
  );
  return DELETE(request, { params: Promise.resolve({ id, quoteId }) });
}

describe("DELETE /api/partner/service-requests/[id]/quotes/[quoteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-1",
      email: "staff@partner.example.com",
      name: "김직원",
      memberType: "PARTNER",
      partnerId: "partner-1",
    });
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      status: "신규",
      selectedQuoteId: null,
    });
    mocks.quoteFindFirst.mockResolvedValue({ id: "quote-1", title: "기본형", amount: 500000 });
    mocks.quoteDelete.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findUnique: mocks.findUnique },
        serviceRequestQuote: { findFirst: mocks.quoteFindFirst, delete: mocks.quoteDelete },
        serviceRequestActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await call();
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for a request belonging to a different partner", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "other-partner",
      status: "신규",
      selectedQuoteId: null,
    });

    const response = await call();
    expect(response.status).toBe(404);
  });

  it("blocks deleting once the status is locked", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      status: "작업 예정",
      selectedQuoteId: null,
    });

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이 상태에서는 견적을 삭제할 수 없습니다.");
    expect(mocks.quoteDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for a quote belonging to a different request", async () => {
    mocks.quoteFindFirst.mockResolvedValue(null);

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("견적을 찾을 수 없습니다.");
  });

  it("blocks deleting the currently-selected quote", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      status: "신규",
      selectedQuoteId: "quote-1",
    });

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("고객이 선택한 견적은 삭제할 수 없습니다.");
    expect(mocks.quoteDelete).not.toHaveBeenCalled();
  });

  it("deletes an unselected quote and logs a QUOTE_REMOVED activity", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(mocks.quoteDelete).toHaveBeenCalledWith({ where: { id: "quote-1" } });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceRequestId: "request-1",
        action: "QUOTE_REMOVED",
        changes: { quoteId: "quote-1", title: "기본형", amount: 500000 },
        actorRole: "PARTNER",
      }),
    });
  });

  it("returns 409 on a concurrent-conflict transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.");
  });

  it("runs inside a Serializable transaction", async () => {
    await call();

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
  });
});
