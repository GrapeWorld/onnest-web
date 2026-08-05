import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  inquiryFindFirst: vi.fn(),
  inquiryUpdate: vi.fn(),
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
    inquiry: { findFirst: mocks.inquiryFindFirst, update: mocks.inquiryUpdate },
    inquiryActivity: { create: mocks.activityCreate },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/my/inquiries/[id]/satisfaction/route";

function call(body: unknown, id = "inquiry-1") {
  const request = new Request(`http://localhost/api/my/inquiries/${id}/satisfaction`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/my/inquiries/[id]/satisfaction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com", name: "홍길동" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.inquiryFindFirst.mockResolvedValue({
      id: "inquiry-1",
      status: "답변 완료",
      satisfactionSubmittedAt: null,
    });
    mocks.inquiryUpdate.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        inquiry: { findFirst: mocks.inquiryFindFirst, update: mocks.inquiryUpdate },
        inquiryActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ rating: 5 });
    expect(response.status).toBe(401);
  });

  it("rejects a rating outside 1-5", async () => {
    const response = await call({ rating: 6 });
    expect(response.status).toBe(400);
  });

  it("returns 404 for an inquiry not owned by this user", async () => {
    mocks.inquiryFindFirst.mockResolvedValue(null);

    const response = await call({ rating: 5 });
    expect(response.status).toBe(404);
  });

  it("blocks rating an inquiry that isn't 답변 완료", async () => {
    mocks.inquiryFindFirst.mockResolvedValue({
      id: "inquiry-1",
      status: "검토 중",
      satisfactionSubmittedAt: null,
    });

    const response = await call({ rating: 5 });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("답변이 완료된 문의만 평가할 수 있습니다.");
    expect(mocks.inquiryUpdate).not.toHaveBeenCalled();
  });

  it("blocks submitting a second rating", async () => {
    mocks.inquiryFindFirst.mockResolvedValue({
      id: "inquiry-1",
      status: "답변 완료",
      satisfactionSubmittedAt: new Date(),
    });

    const response = await call({ rating: 5 });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 평가를 남겼습니다.");
  });

  it("saves the rating/comment and logs a SATISFACTION_RATED activity", async () => {
    const response = await call({ rating: 4, comment: "빠른 답변 감사합니다" });

    expect(response.status).toBe(200);
    expect(mocks.inquiryUpdate).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      data: {
        satisfactionRating: 4,
        satisfactionComment: "빠른 답변 감사합니다",
        satisfactionSubmittedAt: expect.any(Date),
      },
    });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inquiryId: "inquiry-1",
        action: "SATISFACTION_RATED",
        changes: { rating: 4, comment: "빠른 답변 감사합니다" },
        actorId: "user-1",
      }),
    });
  });

  it("stores an empty comment as null", async () => {
    await call({ rating: 5, comment: "" });

    expect(mocks.inquiryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ satisfactionComment: null }) }),
    );
  });
});
