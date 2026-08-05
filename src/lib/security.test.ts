import { describe, expect, it } from "vitest";
import { buildResetPasswordUrl, getAppUrl } from "@/lib/appUrl";
import { isSessionCurrent } from "@/lib/authSession";
import { escapeHtml } from "@/lib/email";

describe("security helpers", () => {
  it("escapes user-controlled HTML", () => {
    expect(escapeHtml(`<img src=x onerror="alert('x')">&`)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt;&amp;",
    );
  });

  it("builds reset links from the configured application origin", () => {
    const url = buildResetPasswordUrl("a token&value", "https://onnest.example");
    expect(url.origin).toBe("https://onnest.example");
    expect(url.pathname).toBe("/auth/reset-password");
    expect(url.searchParams.get("token")).toBe("a token&value");
  });

  it("rejects unsafe application URLs", () => {
    expect(() => getAppUrl("javascript:alert(1)", "production")).toThrow();
    expect(() => getAppUrl("https://example.com/path", "production")).toThrow();
    expect(() => getAppUrl("", "production")).toThrow();
  });

  it("accepts only current versioned sessions", () => {
    const user = { id: "user-1", authVersion: 2 };
    expect(isSessionCurrent({ userId: "user-1", authVersion: 2 }, user)).toBe(true);
    expect(isSessionCurrent({ userId: "user-1", authVersion: 1 }, user)).toBe(false);
    expect(isSessionCurrent({ userId: "user-1" }, user)).toBe(false);
    expect(isSessionCurrent({ userId: "user-2", authVersion: 2 }, user)).toBe(false);
  });
});
