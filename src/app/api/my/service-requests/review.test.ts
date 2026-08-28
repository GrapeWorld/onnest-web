import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  requestFindFirst: vi.fn(),
  reviewCreate: vi.fn(),
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
    serviceReview: { create: mocks.reviewCreate },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/my/service-requests/[id]/review/route";

function call(body: unknown, id = "req-1") {
  const request = new Request(`http://localhost/api/my/service-requests/${id}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/my/service-requests/[id]/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com", name: "홍길동" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.requestFindFirst.mockResolvedValue({
      id: "req-1",
      partnerId: "partner-1",
      completionConfirmation: { outcome: "OK" },
      review: null,
    });
    mocks.reviewCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findFirst: mocks.requestFindFirst },
        serviceReview: { create: mocks.reviewCreate },
      }),
    );
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ rating: 5 });
    expect(response.status).toBe(401);
  });

  it("rejects a rating outside 1-5", async () => {
    const response = await call({ rating: 0 });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a request not owned by this user", async () => {
    mocks.requestFindFirst.mockResolvedValue(null);
    const response = await call({ rating: 5 });
    expect(response.status).toBe(404);
  });

  it("blocks reviewing before a positive completion confirmation", async () => {
    mocks.requestFindFirst.mockResolvedValue({
      id: "req-1",
      partnerId: "partner-1",
      completionConfirmation: null,
      review: null,
    });
    const response = await call({ rating: 5 });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("완료 확인(정상 완료)을 먼저 진행해주세요.");
  });

  it("blocks reviewing after an ISSUE confirmation", async () => {
    mocks.requestFindFirst.mockResolvedValue({
      id: "req-1",
      partnerId: "partner-1",
      completionConfirmation: { outcome: "ISSUE" },
      review: null,
    });
    const response = await call({ rating: 5 });
    expect(response.status).toBe(400);
  });

  it("blocks submitting a second review", async () => {
    mocks.requestFindFirst.mockResolvedValue({
      id: "req-1",
      partnerId: "partner-1",
      completionConfirmation: { outcome: "OK" },
      review: { id: "review-1" },
    });
    const response = await call({ rating: 5 });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 후기를 남겼습니다.");
  });

  it("saves the rating/comment", async () => {
    const response = await call({ rating: 4, comment: "친절했어요" });
    expect(response.status).toBe(200);
    expect(mocks.reviewCreate).toHaveBeenCalledWith({
      data: {
        serviceRequestId: "req-1",
        userId: "user-1",
        partnerId: "partner-1",
        rating: 4,
        comment: "친절했어요",
      },
    });
  });

  it("stores an empty comment as null", async () => {
    await call({ rating: 5, comment: "" });
    expect(mocks.reviewCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ comment: null }) }),
    );
  });
});
