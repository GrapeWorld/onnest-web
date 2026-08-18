import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  upsert: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { propertyPreference: { findUnique: mocks.findUnique, upsert: mocks.upsert } },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: (s: number) => `${s}초`,
}));

import { GET, PUT } from "@/app/api/my/property-preference/route";

function putRequest(body: unknown) {
  return new Request("http://localhost/api/my/property-preference", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/my/property-preference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("returns null when nothing was saved yet", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await GET();
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data).toBeNull();
  });

  it("scopes the lookup to the current user", async () => {
    mocks.findUnique.mockResolvedValue(null);
    await GET();
    expect(mocks.findUnique).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});

describe("PUT /api/my/property-preference", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.upsert.mockResolvedValue({ id: "pref-1" });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await PUT(putRequest({ desiredRegion: "강남구" }));
    expect(response.status).toBe(401);
  });

  it("is rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 5 });
    const response = await PUT(putRequest({ desiredRegion: "강남구" }));
    expect(response.status).toBe(429);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("upserts scoped to the current user, keeping one row per user", async () => {
    await PUT(putRequest({ desiredRegion: "강남구", minBudget: 200_000_000 }));
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({ userId: "user-1", desiredRegion: "강남구" }),
        update: expect.objectContaining({ desiredRegion: "강남구" }),
      }),
    );
  });

  it("rejects a negative budget", async () => {
    const response = await PUT(putRequest({ minBudget: -100 }));
    expect(response.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
