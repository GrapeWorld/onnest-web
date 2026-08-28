import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  requestFindFirst: vi.fn(),
  confirmationCreate: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findFirst: mocks.requestFindFirst },
    serviceCompletionConfirmation: { create: mocks.confirmationCreate },
    serviceRequestActivity: { create: mocks.activityCreate },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/my/service-requests/[id]/completion-confirmation/route";

function call(body: unknown, id = "req-1") {
  const request = new Request(`http://localhost/api/my/service-requests/${id}/completion-confirmation`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/my/service-requests/[id]/completion-confirmation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com", name: "홍길동" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.requestFindFirst.mockResolvedValue({
      id: "req-1",
      status: "작업 완료",
      partnerId: "partner-1",
      completionConfirmation: null,
    });
    mocks.confirmationCreate.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findFirst: mocks.requestFindFirst },
        serviceCompletionConfirmation: { create: mocks.confirmationCreate },
        serviceRequestActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ outcome: "OK" });
    expect(response.status).toBe(401);
  });

  it("rejects an invalid outcome", async () => {
    const response = await call({ outcome: "MAYBE" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a request not owned by this user", async () => {
    mocks.requestFindFirst.mockResolvedValue(null);
    const response = await call({ outcome: "OK" });
    expect(response.status).toBe(404);
  });

  it("blocks confirming a request that isn't 작업 완료", async () => {
    mocks.requestFindFirst.mockResolvedValue({
      id: "req-1",
      status: "작업 중",
      partnerId: "partner-1",
      completionConfirmation: null,
    });
    const response = await call({ outcome: "OK" });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("완료된 신청만 확인할 수 있습니다.");
  });

  it("blocks confirming a second time", async () => {
    mocks.requestFindFirst.mockResolvedValue({
      id: "req-1",
      status: "작업 완료",
      partnerId: "partner-1",
      completionConfirmation: { id: "conf-1" },
    });
    const response = await call({ outcome: "OK" });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 확인했습니다.");
  });

  it("records the confirmation and a COMPLETION_CONFIRMED activity", async () => {
    const response = await call({ outcome: "ISSUE" });
    expect(response.status).toBe(200);
    expect(mocks.confirmationCreate).toHaveBeenCalledWith({
      data: { serviceRequestId: "req-1", userId: "user-1", outcome: "ISSUE" },
    });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceRequestId: "req-1",
        action: "COMPLETION_CONFIRMED",
        changes: { outcome: "ISSUE" },
        actorId: "user-1",
      }),
    });
  });
});
