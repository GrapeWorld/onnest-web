import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  consumeLinkToken: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/inquiryLink", () => ({
  consumeLinkToken: mocks.consumeLinkToken,
}));

import { POST } from "@/app/api/my/inquiries/link/confirm/route";

function call(body: unknown) {
  const request = new Request("http://localhost/api/my/inquiries/link/confirm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/my/inquiries/link/confirm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.consumeLinkToken.mockResolvedValue({ ok: true, inquiryId: "inquiry-1" });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ token: "abc" });
    expect(response.status).toBe(401);
  });

  it("rejects a missing token", async () => {
    const response = await call({ token: "" });
    expect(response.status).toBe(400);
  });

  it("passes the logged-in user's id to consumeLinkToken", async () => {
    await call({ token: "abc" });

    expect(mocks.consumeLinkToken).toHaveBeenCalledWith({ token: "abc", userId: "user-1" });
  });

  it("returns the linked inquiryId on success", async () => {
    const response = await call({ token: "abc" });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.inquiryId).toBe("inquiry-1");
  });

  it("returns 400 for an invalid/expired/mismatched token", async () => {
    mocks.consumeLinkToken.mockResolvedValue({ ok: false, reason: "invalid" });

    const response = await call({ token: "abc" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("만료");
  });
});
