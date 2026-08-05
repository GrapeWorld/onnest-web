import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  deleteMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    rateLimitBucket: {
      upsert: mocks.upsert,
      deleteMany: mocks.deleteMany,
    },
  },
}));

import { checkRateLimit, getRateLimitWindow } from "@/lib/rateLimit";

describe("database rate limit buckets", () => {
  beforeEach(() => {
    mocks.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("calculates deterministic fixed windows", () => {
    const now = new Date("2026-08-02T00:09:59.500Z");
    expect(getRateLimitWindow(now, 600)).toEqual({
      windowStart: new Date("2026-08-02T00:00:00.000Z"),
      expiresAt: new Date("2026-08-02T00:10:00.000Z"),
    });
  });

  it("allows a count at the configured maximum", async () => {
    mocks.upsert.mockResolvedValue({ count: 10 });
    await expect(checkRateLimit("login", "ip-1")).resolves.toEqual({ ok: true });
  });

  it("rejects a count above the configured maximum", async () => {
    mocks.upsert.mockResolvedValue({ count: 11 });
    const result = await checkRateLimit("login", "ip-1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });
});
