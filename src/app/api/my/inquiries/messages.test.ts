import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  inquiryFindFirst: vi.fn(),
  messageCreate: vi.fn(),
  notifyAdmin: vi.fn(),
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
    inquiry: { findFirst: mocks.inquiryFindFirst },
    inquiryMessage: { create: mocks.messageCreate },
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyAdmin: mocks.notifyAdmin,
}));
vi.mock("@/lib/appUrl", () => ({
  getAppUrl: () => "https://app.example.com",
}));

import { POST } from "@/app/api/my/inquiries/[id]/messages/route";

function call(body: unknown, id = "inquiry-1") {
  const request = new Request(`http://localhost/api/my/inquiries/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/my/inquiries/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com", name: "홍길동" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.inquiryFindFirst.mockResolvedValue({ id: "inquiry-1", name: "홍길동" });
    mocks.messageCreate.mockResolvedValue({ id: "message-1" });
    mocks.notifyAdmin.mockResolvedValue(undefined);
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call({ body: "질문 있습니다" });

    expect(response.status).toBe(401);
  });

  it("rejects an empty message", async () => {
    const response = await call({ body: "" });
    expect(response.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 30 });

    const response = await call({ body: "질문 있습니다" });
    expect(response.status).toBe(429);
  });

  it("returns 404 for an inquiry that doesn't belong to this user (existence hidden)", async () => {
    mocks.inquiryFindFirst.mockResolvedValue(null);

    const response = await call({ body: "질문 있습니다" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("문의를 찾을 수 없습니다.");
  });

  it("creates a CUSTOMER message and notifies the admin", async () => {
    const response = await call({ body: "언제쯤 답변 가능한가요?" });

    expect(response.status).toBe(201);
    expect(mocks.messageCreate).toHaveBeenCalledWith({
      data: {
        inquiryId: "inquiry-1",
        senderRole: "CUSTOMER",
        body: "언제쯤 답변 가능한가요?",
        senderId: "user-1",
        senderEmail: "user@example.com",
        senderName: "홍길동",
      },
    });
    expect(mocks.notifyAdmin).toHaveBeenCalledTimes(1);
  });

  it("still returns 201 when the admin notification fails", async () => {
    mocks.notifyAdmin.mockRejectedValue(new Error("resend down"));

    const response = await call({ body: "질문 있습니다" });

    expect(response.status).toBe(201);
  });

  it("scopes the lookup to inquiries owned by the current user", async () => {
    await call({ body: "질문 있습니다" });

    expect(mocks.inquiryFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "inquiry-1", userId: "user-1" } }),
    );
  });
});
