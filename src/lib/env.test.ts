import { afterEach, describe, expect, it } from "vitest";
import { validateServerEnv } from "@/lib/env";

const originalEnv = { ...process.env };

function resetEnv() {
  for (const key of Object.keys(process.env)) delete process.env[key];
  Object.assign(process.env, originalEnv);
}

// @types/node이 NODE_ENV를 readonly로 선언해 직접 대입이 막혀 있다.
function setNodeEnv(value: string) {
  Object.assign(process.env, { NODE_ENV: value });
}

describe("validateServerEnv", () => {
  afterEach(resetEnv);

  it("passes with a complete, valid configuration", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.SESSION_SECRET = "a".repeat(32);
    setNodeEnv("development");
    delete process.env.RESEND_API_KEY;
    delete process.env.RESEND_FROM;

    expect(() => validateServerEnv()).not.toThrow();
  });

  it("throws when DATABASE_URL is missing", () => {
    delete process.env.DATABASE_URL;
    process.env.SESSION_SECRET = "a".repeat(32);

    expect(() => validateServerEnv()).toThrow(/DATABASE_URL/);
  });

  it("throws when SESSION_SECRET is too short", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.SESSION_SECRET = "too-short";

    expect(() => validateServerEnv()).toThrow(/SESSION_SECRET/);
  });

  it("requires APP_URL in production only", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.SESSION_SECRET = "a".repeat(32);
    delete process.env.APP_URL;

    setNodeEnv("development");
    expect(() => validateServerEnv()).not.toThrow();

    setNodeEnv("production");
    expect(() => validateServerEnv()).toThrow(/APP_URL/);
  });

  it("rejects RESEND_API_KEY without RESEND_FROM (and vice versa)", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.SESSION_SECRET = "a".repeat(32);
    setNodeEnv("development");

    process.env.RESEND_API_KEY = "re_123";
    delete process.env.RESEND_FROM;
    expect(() => validateServerEnv()).toThrow(/RESEND_API_KEY.*RESEND_FROM/);

    delete process.env.RESEND_API_KEY;
    process.env.RESEND_FROM = "ONNEST <no-reply@example.com>";
    expect(() => validateServerEnv()).toThrow(/RESEND_API_KEY.*RESEND_FROM/);

    process.env.RESEND_API_KEY = "re_123";
    expect(() => validateServerEnv()).not.toThrow();
  });

  it("allows ADMIN_NOTIFICATION_EMAIL to be unset", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.SESSION_SECRET = "a".repeat(32);
    setNodeEnv("development");
    delete process.env.ADMIN_NOTIFICATION_EMAIL;

    expect(() => validateServerEnv()).not.toThrow();
  });

  it("rejects a malformed ADMIN_NOTIFICATION_EMAIL", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.SESSION_SECRET = "a".repeat(32);
    setNodeEnv("development");
    process.env.ADMIN_NOTIFICATION_EMAIL = "not-an-email";

    expect(() => validateServerEnv()).toThrow(/ADMIN_NOTIFICATION_EMAIL/);
  });

  it("accepts a valid ADMIN_NOTIFICATION_EMAIL", () => {
    process.env.DATABASE_URL = "postgresql://user:pass@host:5432/db";
    process.env.SESSION_SECRET = "a".repeat(32);
    setNodeEnv("development");
    process.env.ADMIN_NOTIFICATION_EMAIL = "ops@example.com";

    expect(() => validateServerEnv()).not.toThrow();
  });
});
