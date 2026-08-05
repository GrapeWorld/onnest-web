import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isProviderConfigured: vi.fn(() => true),
  checkRateLimit: vi.fn(),
  getCurrentUser: vi.fn(),
  completeOAuthExchange: vi.fn(),
  getRedirectUri: vi.fn(() => "https://app.example.com/api/auth/oauth/google/callback"),
  socialAccountFindUnique: vi.fn(),
  socialAccountUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/oauth/providers", () => ({
  isProviderConfigured: mocks.isProviderConfigured,
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/oauth", () => ({
  completeOAuthExchange: mocks.completeOAuthExchange,
  getRedirectUri: mocks.getRedirectUri,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialAccount: {
      findUnique: mocks.socialAccountFindUnique,
      update: mocks.socialAccountUpdate,
    },
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    $transaction: mocks.transaction,
  },
}));

let oauthSessionFixture: Record<string, unknown> = {};
const oauthSessionInstances: Array<Record<string, unknown>> = [];
vi.mock("@/lib/oauth/session", () => ({
  getOAuthSession: vi.fn(async () => {
    const instance: Record<string, unknown> = {
      ...oauthSessionFixture,
      save: vi.fn(async () => {}),
      destroy: vi.fn(async () => {
        oauthSessionFixture = {};
      }),
    };
    oauthSessionInstances.push(instance);
    return instance;
  }),
}));

let realSession: Record<string, unknown>;
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => realSession),
}));

import { GET } from "@/app/api/auth/oauth/[provider]/callback/route";

function call(provider: string, query: string) {
  const request = new Request(`http://localhost/api/auth/oauth/${provider}/callback${query}`);
  return GET(request, { params: Promise.resolve({ provider }) });
}

function location(response: Response) {
  return response.headers.get("location") ?? "";
}

function oauthErrorOf(response: Response) {
  return new URL(location(response)).searchParams.get("oauthError");
}

const validProfile = {
  provider: "google",
  providerAccountId: "provider-user-1",
  email: "user@example.com",
  emailVerified: true,
  name: "홍길동",
  profileImage: null,
};

describe("GET /api/auth/oauth/[provider]/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    oauthSessionInstances.length = 0;
    oauthSessionFixture = {
      provider: "google",
      mode: "login",
      state: "expected-state",
      codeVerifier: "verifier",
      nonce: "nonce-value",
      returnTo: "/my",
    };
    realSession = { save: vi.fn(async () => {}) };

    mocks.isProviderConfigured.mockReturnValue(true);
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.completeOAuthExchange.mockResolvedValue(validProfile);
    mocks.socialAccountFindUnique.mockResolvedValue(null);
    mocks.userFindUnique.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        socialAccount: { create: vi.fn(async () => ({})) },
        user: { update: mocks.userUpdate },
      }),
    );
  });

  it("returns 404 for an unconfigured/unknown provider", async () => {
    mocks.isProviderConfigured.mockReturnValue(false);
    const response = await call("google", "?code=abc&state=expected-state");
    expect(response.status).toBe(404);
  });

  it("redirects with oauthError=cancelled when the provider reports an error (user cancelled)", async () => {
    const response = await call("google", "?error=access_denied");
    expect(oauthErrorOf(response)).toBe("cancelled");
    expect(mocks.completeOAuthExchange).not.toHaveBeenCalled();
  });

  it("redirects with oauthError=expired when there is no code", async () => {
    const response = await call("google", "?state=expected-state");
    expect(oauthErrorOf(response)).toBe("expired");
  });

  it("redirects with oauthError=expired when the oauth session has no stored state (session expired/replayed)", async () => {
    oauthSessionFixture = {};
    const response = await call("google", "?code=abc&state=whatever");
    expect(oauthErrorOf(response)).toBe("expired");
  });

  it("rejects a mismatched state (invalid_state) and never calls the token exchange", async () => {
    const response = await call("google", "?code=abc&state=wrong-state");
    expect(oauthErrorOf(response)).toBe("invalid_state");
    expect(mocks.completeOAuthExchange).not.toHaveBeenCalled();
  });

  it("rejects a state that doesn't match the session's own provider (cross-provider confusion)", async () => {
    oauthSessionFixture.provider = "kakao";
    const response = await call("google", "?code=abc&state=expected-state");
    expect(oauthErrorOf(response)).toBe("invalid_state");
  });

  it("destroys the oauth session before doing any exchange work (state cannot be reused)", async () => {
    await call("google", "?code=abc&state=expected-state");
    expect(oauthSessionInstances[0].destroy).toHaveBeenCalled();
  });

  it("replaying the same callback URL a second time fails (state already consumed)", async () => {
    await call("google", "?code=abc&state=expected-state");
    // 세션이 destroy()로 비워졌으니 같은 code/state로 다시 열어도 통과하지 못한다.
    const response = await call("google", "?code=abc&state=expected-state");
    expect(oauthErrorOf(response)).toBe("expired");
  });

  it("maps any token-exchange failure (bad signature/issuer/audience/network) to a generic provider_error", async () => {
    mocks.completeOAuthExchange.mockRejectedValue(new Error("invalid issuer"));
    const response = await call("google", "?code=abc&state=expected-state");
    expect(oauthErrorOf(response)).toBe("provider_error");
    // 원본 예외 메시지가 리다이렉트 URL로 새지 않는다.
    expect(location(response)).not.toContain("invalid issuer");
  });

  it("logs into an existing linked account and sets the session", async () => {
    mocks.socialAccountFindUnique.mockResolvedValue({
      userId: "user-1",
      user: { id: "user-1", authVersion: 3, status: "ACTIVE" },
    });

    const response = await call("google", "?code=abc&state=expected-state");

    expect(location(response)).toBe("http://localhost/my");
    expect(realSession.userId).toBe("user-1");
    expect(realSession.authVersion).toBe(3);
    expect(realSession.save).toHaveBeenCalled();
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it.each(["kakao", "naver"])(
    "dispatches to the right provider (%s) for an existing-account login",
    async (provider) => {
      oauthSessionFixture.provider = provider;
      mocks.socialAccountFindUnique.mockResolvedValue({
        userId: "user-1",
        user: { id: "user-1", authVersion: 0, status: "ACTIVE" },
      });

      const response = await call(provider, "?code=abc&state=expected-state");

      expect(mocks.completeOAuthExchange).toHaveBeenCalledWith(
        provider,
        expect.objectContaining({ code: "abc" }),
      );
      expect(realSession.userId).toBe("user-1");
      expect(response.status).toBeGreaterThanOrEqual(300);
    },
  );

  it.each(["SUSPENDED", "WITHDRAWN", "BLOCKED"])(
    "refuses login for a %s account without revealing the specific status",
    async (status) => {
      mocks.socialAccountFindUnique.mockResolvedValue({
        userId: "user-1",
        user: { id: "user-1", authVersion: 0, status },
      });

      const response = await call("google", "?code=abc&state=expected-state");

      expect(oauthErrorOf(response)).toBe("login_failed");
      expect(realSession.userId).toBeUndefined();
    },
  );

  it("does not auto-link when a User with the same email already exists", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: "existing-user" });

    const response = await call("google", "?code=abc&state=expected-state");

    expect(oauthErrorOf(response)).toBe("account_conflict");
    expect(realSession.userId).toBeUndefined();
  });

  it("routes to signup completion when email is missing", async () => {
    mocks.completeOAuthExchange.mockResolvedValue({ ...validProfile, email: null });

    const response = await call("google", "?code=abc&state=expected-state");

    expect(oauthErrorOf(response)).toBe("email_unverified");
  });

  it("routes to signup completion guard when email is present but unverified", async () => {
    mocks.completeOAuthExchange.mockResolvedValue({ ...validProfile, emailVerified: false });

    const response = await call("google", "?code=abc&state=expected-state");

    expect(oauthErrorOf(response)).toBe("email_unverified");
  });

  it("stashes the verified profile and redirects to the completion page for a genuinely new user", async () => {
    const response = await call("google", "?code=abc&state=expected-state");

    expect(location(response)).toBe("http://localhost/auth/oauth/complete");
    const finalSession = oauthSessionInstances[oauthSessionInstances.length - 1];
    expect(finalSession.pendingProfile).toEqual(validProfile);
    expect(finalSession.state).toBeUndefined();
    expect(finalSession.codeVerifier).toBeUndefined();
  });

  describe("mode: link", () => {
    beforeEach(() => {
      oauthSessionFixture.mode = "link";
      oauthSessionFixture.actingUserId = "user-1";
      mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
      mocks.userUpdate.mockResolvedValue({ authVersion: 9 });
    });

    it("rejects when the acting user is no longer logged in", async () => {
      mocks.getCurrentUser.mockResolvedValue(null);
      const response = await call("google", "?code=abc&state=expected-state");
      expect(oauthErrorOf(response)).toBe("reauth_failed");
    });

    it("rejects when the current session belongs to a different user than who started the flow", async () => {
      mocks.getCurrentUser.mockResolvedValue({ id: "someone-else" });
      const response = await call("google", "?code=abc&state=expected-state");
      expect(oauthErrorOf(response)).toBe("reauth_failed");
    });

    it("blocks linking a provider account already linked to a different user", async () => {
      mocks.socialAccountFindUnique.mockResolvedValue({ userId: "other-user" });
      const response = await call("google", "?code=abc&state=expected-state");
      expect(oauthErrorOf(response)).toBe("already_linked");
    });

    it("creates the connection, bumps authVersion, and syncs the current session", async () => {
      const response = await call("google", "?code=abc&state=expected-state");

      expect(location(response)).toBe("http://localhost/my?linked=1");
      expect(realSession.userId).toBe("user-1");
      expect(realSession.authVersion).toBe(9);
    });

    it("treats re-linking the same account to itself as an idempotent success (no duplicate)", async () => {
      mocks.socialAccountFindUnique.mockResolvedValue({ userId: "user-1" });
      const response = await call("google", "?code=abc&state=expected-state");
      expect(location(response)).toBe("http://localhost/my?linked=1");
      expect(mocks.transaction).not.toHaveBeenCalled();
    });

    it("handles a concurrent-link race (unique constraint violation) as already_linked instead of a 500", async () => {
      const { Prisma } = await import("@prisma/client");
      mocks.transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("duplicate", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      const response = await call("google", "?code=abc&state=expected-state");

      expect(oauthErrorOf(response)).toBe("already_linked");
    });
  });

  describe("mode: delete-confirm", () => {
    beforeEach(() => {
      oauthSessionFixture.mode = "delete-confirm";
      oauthSessionFixture.actingUserId = "user-1";
      mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    });

    it("rejects when re-authenticating with a provider account not linked to this user", async () => {
      mocks.socialAccountFindUnique.mockResolvedValue({ userId: "someone-else" });
      const response = await call("google", "?code=abc&state=expected-state");
      expect(oauthErrorOf(response)).toBe("reauth_failed");
    });

    it("rejects when the provider account isn't linked to anyone", async () => {
      mocks.socialAccountFindUnique.mockResolvedValue(null);
      const response = await call("google", "?code=abc&state=expected-state");
      expect(oauthErrorOf(response)).toBe("reauth_failed");
    });

    it("sets a short-lived delete-approved timestamp on success", async () => {
      mocks.socialAccountFindUnique.mockResolvedValue({ userId: "user-1" });
      const before = Date.now();

      const response = await call("google", "?code=abc&state=expected-state");

      expect(location(response)).toBe("http://localhost/my?deleteApproved=1");
      expect(realSession.deleteApprovedAt as number).toBeGreaterThanOrEqual(before);
    });
  });

  it("returns 429 when the callback rate limit is exceeded", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 30 });
    const response = await call("google", "?code=abc&state=expected-state");
    expect(oauthErrorOf(response)).toBe("rate_limited");
    expect(mocks.completeOAuthExchange).not.toHaveBeenCalled();
  });
});
