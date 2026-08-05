import { describe, expect, it } from "vitest";
import { sanitizeReturnTo } from "@/lib/oauth/returnTo";

describe("sanitizeReturnTo", () => {
  it("allows a plain internal relative path", () => {
    expect(sanitizeReturnTo("/projects/123")).toBe("/projects/123");
  });

  it("falls back for undefined/null/empty", () => {
    expect(sanitizeReturnTo(undefined)).toBe("/my");
    expect(sanitizeReturnTo(null)).toBe("/my");
    expect(sanitizeReturnTo("")).toBe("/my");
  });

  it("rejects absolute external URLs", () => {
    expect(sanitizeReturnTo("https://evil.com/phish")).toBe("/my");
    expect(sanitizeReturnTo("http://evil.com")).toBe("/my");
  });

  it("rejects protocol-relative URLs", () => {
    expect(sanitizeReturnTo("//evil.com")).toBe("/my");
  });

  it("rejects javascript: and other non-path values", () => {
    expect(sanitizeReturnTo("javascript:alert(1)")).toBe("/my");
  });

  it("rejects paths containing backslashes (browser-normalization trick)", () => {
    expect(sanitizeReturnTo("/\\evil.com")).toBe("/my");
  });

  it("honors a custom fallback", () => {
    expect(sanitizeReturnTo(undefined, "/admin")).toBe("/admin");
  });
});
