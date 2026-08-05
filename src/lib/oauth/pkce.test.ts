import { describe, expect, it } from "vitest";
import {
  generateState,
  generateCodeVerifier,
  generateNonce,
  createCodeChallenge,
  timingSafeEqualString,
} from "@/lib/oauth/pkce";

describe("generateState/generateCodeVerifier/generateNonce", () => {
  it("produce sufficiently long, URL-safe, unique values", () => {
    const values = [generateState(), generateCodeVerifier(), generateNonce()];
    for (const value of values) {
      expect(value.length).toBeGreaterThanOrEqual(32);
      expect(value).toMatch(/^[A-Za-z0-9_-]+$/);
    }
    expect(new Set([generateState(), generateState()]).size).toBe(2);
  });
});

describe("createCodeChallenge", () => {
  it("matches the RFC 7636 S256 test vector", () => {
    // RFC 7636 appendix B example.
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    expect(createCodeChallenge(verifier)).toBe("E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM");
  });
});

describe("timingSafeEqualString", () => {
  it("returns true for identical strings", () => {
    expect(timingSafeEqualString("same-value", "same-value")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(timingSafeEqualString("aaaaaaaa", "bbbbbbbb")).toBe(false);
  });

  it("returns false (not throw) for different-length strings", () => {
    expect(timingSafeEqualString("short", "much-longer-string")).toBe(false);
  });
});
