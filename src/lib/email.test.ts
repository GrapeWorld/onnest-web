import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { escapeHtml, notifyAdmin } from "@/lib/email";

const originalEnv = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}

describe("escapeHtml", () => {
  it("escapes the five HTML-significant characters", () => {
    expect(escapeHtml(`<a href="x">it's & "quoted"</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;it&#39;s &amp; &quot;quoted&quot;&lt;/a&gt;",
    );
  });
});

describe("notifyAdmin", () => {
  beforeEach(() => {
    resetEnv();
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    resetEnv();
    vi.restoreAllMocks();
  });

  it("skips without throwing when ADMIN_NOTIFICATION_EMAIL is unset", async () => {
    delete process.env.ADMIN_NOTIFICATION_EMAIL;

    await expect(
      notifyAdmin({ subject: "test", html: "<p>test</p>" }),
    ).resolves.toBeUndefined();
    expect(console.warn).toHaveBeenCalledWith(
      expect.stringContaining("ADMIN_NOTIFICATION_EMAIL missing"),
    );
  });

  it("does not throw when configured but RESEND_API_KEY is missing (dev fallback)", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "ops@example.com";

    await expect(
      notifyAdmin({ subject: "test", html: "<p>test</p>" }),
    ).resolves.toBeUndefined();
  });
});
