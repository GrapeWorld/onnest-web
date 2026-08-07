import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  consumeInvitation: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/partnerInvitation", () => ({
  consumeInvitation: mocks.consumeInvitation,
}));

import { POST } from "@/app/api/partner/invitations/[token]/accept/route";

function call(token = "some-token") {
  const request = new Request(`http://localhost/api/partner/invitations/${token}/accept`, {
    method: "POST",
  });
  return POST(request, { params: Promise.resolve({ token }) });
}

describe("POST /api/partner/invitations/[token]/accept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user@example.com",
      adminRole: null,
    });
    mocks.consumeInvitation.mockResolvedValue({ ok: true, partnerId: "partner-1" });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(401);
    expect(mocks.consumeInvitation).not.toHaveBeenCalled();
  });

  it("passes the logged-in user's id/email/adminRole to consumeInvitation", async () => {
    await call("token-abc");

    expect(mocks.consumeInvitation).toHaveBeenCalledWith({
      token: "token-abc",
      user: { id: "user-1", email: "user@example.com", adminRole: null },
    });
  });

  it("returns the partnerId on success", async () => {
    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.partnerId).toBe("partner-1");
  });

  it.each([
    ["invalid", "만료되었거나 이미 사용"],
    ["email-mismatch", "다른 이메일로 발송"],
    ["admin-conflict", "관리자 계정은"],
    ["already-member", "이미 다른 업체에"],
  ])("maps reason %s to a readable 400 message", async (reason, expectedSubstring) => {
    mocks.consumeInvitation.mockResolvedValue({ ok: false, reason });

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain(expectedSubstring);
  });

  it("returns 409 when consumeInvitation throws (Serializable conflict)", async () => {
    mocks.consumeInvitation.mockRejectedValue(new Error("could not serialize access"));

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.");
  });
});
