import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  inquiryFindFirst: vi.fn(),
  createLinkToken: vi.fn(),
  notifyInquiryCustomer: vi.fn(),
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
  },
}));
vi.mock("@/lib/inquiryLink", () => ({
  createLinkToken: mocks.createLinkToken,
}));
vi.mock("@/lib/email", () => ({
  notifyInquiryCustomer: mocks.notifyInquiryCustomer,
}));
vi.mock("@/lib/appUrl", () => ({
  getAppUrl: () => "https://app.example.com",
}));

import { POST } from "@/app/api/my/inquiries/link-requests/route";

function call(body: unknown) {
  const request = new Request("http://localhost/api/my/inquiries/link-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/my/inquiries/link-requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.inquiryFindFirst.mockResolvedValue({ id: "inquiry-1", email: "user@example.com" });
    mocks.createLinkToken.mockResolvedValue("plain-token");
    mocks.notifyInquiryCustomer.mockResolvedValue(undefined);
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ inquiryId: "inquiry-1" });
    expect(response.status).toBe(401);
  });

  it("re-verifies email match and unlinked status server-side", async () => {
    await call({ inquiryId: "inquiry-1" });

    expect(mocks.inquiryFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "inquiry-1", email: "user@example.com", userId: null },
      }),
    );
  });

  it("returns 404 when no eligible inquiry matches (existence hidden)", async () => {
    mocks.inquiryFindFirst.mockResolvedValue(null);

    const response = await call({ inquiryId: "someone-elses-inquiry" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("연결할 수 있는 문의를 찾을 수 없습니다.");
    expect(mocks.createLinkToken).not.toHaveBeenCalled();
  });

  it("creates a token and emails the confirm link to the inquiry's email", async () => {
    const response = await call({ inquiryId: "inquiry-1" });

    expect(response.status).toBe(200);
    expect(mocks.createLinkToken).toHaveBeenCalledWith({ inquiryId: "inquiry-1", userId: "user-1" });
    expect(mocks.notifyInquiryCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@example.com" }),
    );
    expect(mocks.notifyInquiryCustomer.mock.calls[0][0].html).toContain("plain-token");
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 30 });

    const response = await call({ inquiryId: "inquiry-1" });
    expect(response.status).toBe(429);
    expect(mocks.createLinkToken).not.toHaveBeenCalled();
  });
});
