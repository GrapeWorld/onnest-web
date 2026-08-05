import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  jwtVerify: vi.fn(),
}));

vi.mock("jose", () => ({
  jwtVerify: mocks.jwtVerify,
  createRemoteJWKSet: vi.fn(() => ({})),
}));
vi.mock("@/lib/oauth/providers", () => ({
  getProviderCredentials: () => ({ clientId: "test-client-id", clientSecret: "test-secret" }),
}));

import { verifyGoogleIdToken } from "@/lib/oauth/google";

describe("verifyGoogleIdToken", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes a valid, matching-nonce payload", async () => {
    mocks.jwtVerify.mockResolvedValue({
      payload: {
        sub: "google-user-1",
        email: "user@example.com",
        email_verified: true,
        name: "홍길동",
        picture: "https://example.com/pic.jpg",
        nonce: "expected-nonce",
      },
    });

    const profile = await verifyGoogleIdToken("fake.jwt.token", "expected-nonce");

    expect(profile).toEqual({
      provider: "google",
      providerAccountId: "google-user-1",
      email: "user@example.com",
      emailVerified: true,
      name: "홍길동",
      profileImage: "https://example.com/pic.jpg",
    });
  });

  it("rejects a mismatched nonce even when the signature/issuer/audience are valid", async () => {
    mocks.jwtVerify.mockResolvedValue({
      payload: { sub: "google-user-1", nonce: "attacker-supplied-nonce" },
    });

    await expect(verifyGoogleIdToken("fake.jwt.token", "expected-nonce")).rejects.toThrow(
      /nonce/,
    );
  });

  it("rejects a payload missing sub", async () => {
    mocks.jwtVerify.mockResolvedValue({
      payload: { nonce: "expected-nonce" },
    });

    await expect(verifyGoogleIdToken("fake.jwt.token", "expected-nonce")).rejects.toThrow(/sub/);
  });

  it("propagates jose's own signature/issuer/audience/expiration failures", async () => {
    mocks.jwtVerify.mockRejectedValue(new Error("JWTClaimValidationFailed: unexpected iss"));

    await expect(verifyGoogleIdToken("fake.jwt.token", "expected-nonce")).rejects.toThrow(
      /unexpected iss/,
    );
  });

  it("treats email_verified !== true as unverified", async () => {
    mocks.jwtVerify.mockResolvedValue({
      payload: { sub: "google-user-1", nonce: "expected-nonce", email: "u@example.com" },
    });

    const profile = await verifyGoogleIdToken("fake.jwt.token", "expected-nonce");
    expect(profile.emailVerified).toBe(false);
  });
});
