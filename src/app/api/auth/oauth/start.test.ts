import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isProviderConfigured: vi.fn(() => true),
  checkRateLimit: vi.fn(),
  getCurrentUser: vi.fn(),
  buildAuthorizationUrl: vi.fn(),
  getRedirectUri: vi.fn(() => "https://app.example.com/api/auth/oauth/google/callback"),
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
  buildAuthorizationUrl: mocks.buildAuthorizationUrl,
  getRedirectUri: mocks.getRedirectUri,
}));

let savedSession: Record<string, unknown> | null = null;
vi.mock("@/lib/oauth/session", () => ({
  getOAuthSession: vi.fn(async () => {
    const session: Record<string, unknown> = {
      save: vi.fn(async () => {
        savedSession = { ...session };
      }),
    };
    return session;
  }),
}));

import { GET } from "@/app/api/auth/oauth/[provider]/start/route";

function call(provider: string, query = "") {
  const request = new Request(`http://localhost/api/auth/oauth/${provider}/start${query}`);
  return GET(request, { params: Promise.resolve({ provider }) });
}

describe("GET /api/auth/oauth/[provider]/start", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    savedSession = null;
    mocks.isProviderConfigured.mockReturnValue(true);
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.buildAuthorizationUrl.mockReturnValue(
      new URL("https://accounts.google.com/o/oauth2/v2/auth?mock=1"),
    );
  });

  it("returns 404 for an unknown provider", async () => {
    const response = await call("facebook");
    expect(response.status).toBe(404);
  });

  it("returns 404 for a known but unconfigured provider", async () => {
    mocks.isProviderConfigured.mockReturnValue(false);
    const response = await call("google");
    expect(response.status).toBe(404);
  });

  it("redirects to the provider's authorization URL on success", async () => {
    const response = await call("google");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("accounts.google.com");
  });

  it("stores state (and PKCE/nonce for google) in the oauth session before redirecting", async () => {
    await call("google");

    expect(savedSession).toMatchObject({ provider: "google", mode: "login" });
    expect(typeof savedSession?.state).toBe("string");
    expect(typeof savedSession?.codeVerifier).toBe("string");
    expect(typeof savedSession?.nonce).toBe("string");
  });

  it("does not generate PKCE/nonce for kakao", async () => {
    await call("kakao");

    expect(savedSession?.codeVerifier).toBeUndefined();
    expect(savedSession?.nonce).toBeUndefined();
  });

  it("sanitizes an external returnTo before storing it", async () => {
    await call("google", "?returnTo=https://evil.com");

    expect(savedSession?.returnTo).toBe("/my");
  });

  it("keeps a safe internal returnTo", async () => {
    await call("google", "?returnTo=/projects/123");

    expect(savedSession?.returnTo).toBe("/projects/123");
  });

  it("requires login for link mode and redirects to /auth/login instead of starting the flow", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call("google", "?mode=link");

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/auth/login");
    expect(mocks.buildAuthorizationUrl).not.toHaveBeenCalled();
  });

  it("requires login for delete-confirm mode", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call("google", "?mode=delete-confirm");

    expect(response.headers.get("location")).toContain("/auth/login");
  });

  it("proceeds with link mode when logged in, recording the acting user", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });

    await call("google", "?mode=link");

    expect(savedSession).toMatchObject({ mode: "link", actingUserId: "user-1" });
  });

  it("rejects requests over the OAuth-start rate limit", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call("google");

    expect(response.status).toBe(429);
    expect(mocks.buildAuthorizationUrl).not.toHaveBeenCalled();
  });
});
