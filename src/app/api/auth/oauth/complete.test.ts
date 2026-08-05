import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  userCreate: vi.fn(),
  socialAccountCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { create: mocks.userCreate },
    socialAccount: { create: mocks.socialAccountCreate },
    $transaction: mocks.transaction,
  },
}));

let oauthSessionFixture: Record<string, unknown> = {};
vi.mock("@/lib/oauth/session", () => ({
  getOAuthSession: vi.fn(async () => ({
    ...oauthSessionFixture,
    destroy: vi.fn(async () => {
      oauthSessionFixture = {};
    }),
  })),
}));

let realSession: Record<string, unknown>;
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => realSession),
}));

import { POST } from "@/app/api/auth/oauth/complete/route";

function call(body: unknown) {
  const request = new Request("http://localhost/api/auth/oauth/complete", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

const pendingProfile = {
  provider: "google",
  providerAccountId: "provider-user-1",
  email: "new-user@example.com",
  emailVerified: true,
  name: "홍길동",
  profileImage: null,
};

describe("POST /api/auth/oauth/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oauthSessionFixture = { pendingProfile };
    realSession = { save: vi.fn(async () => {}) };
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.userCreate.mockResolvedValue({
      id: "new-user-1",
      email: pendingProfile.email,
      name: "홍길동",
      authVersion: 0,
    });
    mocks.socialAccountCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({ user: { create: mocks.userCreate }, socialAccount: { create: mocks.socialAccountCreate } }),
    );
  });

  it("rejects when there is no pending profile (expired/forged session)", async () => {
    oauthSessionFixture = {};

    const response = await call({ name: "홍길동", agreeTerms: true });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("세션이 만료");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects without terms agreement", async () => {
    const response = await call({ name: "홍길동", agreeTerms: false });
    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const response = await call({ name: "", agreeTerms: true });
    expect(response.status).toBe(400);
  });

  it("creates the user and social account together, using the provider-verified email (not client input)", async () => {
    const response = await call({
      name: "홍길동",
      phone: "010-1234-5678",
      agreeTerms: true,
    });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(mocks.userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "new-user@example.com",
        name: "홍길동",
        phone: "010-1234-5678",
        termsAgreedAt: expect.any(Date),
      }),
    });
    expect(mocks.socialAccountCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "new-user-1",
        provider: "google",
        providerAccountId: "provider-user-1",
      }),
    });
    expect(data.user.email).toBe("new-user@example.com");
  });

  it("logs the new user in immediately after creation", async () => {
    await call({ name: "홍길동", agreeTerms: true });

    expect(realSession.userId).toBe("new-user-1");
    expect(realSession.authVersion).toBe(0);
    expect(realSession.save).toHaveBeenCalled();
  });

  it("returns 409 when the email was taken concurrently (race with another signup)", async () => {
    const { Prisma } = await import("@prisma/client");
    mocks.transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    const response = await call({ name: "홍길동", agreeTerms: true });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("이미 가입된 이메일입니다.");
  });
});
