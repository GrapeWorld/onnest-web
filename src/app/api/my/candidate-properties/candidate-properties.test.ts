import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  checkRateLimit: vi.fn(),
  geocodeAddress: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { candidateProperty: { findMany: mocks.findMany, create: mocks.create, update: mocks.update } },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: (s: number) => `${s}초`,
}));
vi.mock("@/lib/naverMap", () => ({ geocodeAddress: mocks.geocodeAddress }));

import { GET, POST } from "@/app/api/my/candidate-properties/route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/my/candidate-properties", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validPayload = {
  sourceUrl: "https://fin.land.naver.com/complexes/123",
  title: "테스트 아파트",
  transactionType: "전세",
  price: null,
  deposit: 300_000_000,
};

describe("GET /api/my/candidate-properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET();
    expect(response.status).toBe(401);
  });

  it("only queries the current user's own rows", async () => {
    mocks.findMany.mockResolvedValue([]);
    await GET();
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    );
  });
});

describe("POST /api/my/candidate-properties", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.create.mockResolvedValue({ id: "candidate-1" });
    mocks.geocodeAddress.mockResolvedValue(null);
    mocks.update.mockResolvedValue({});
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await POST(postRequest(validPayload));
    expect(response.status).toBe(401);
  });

  it("is rate limited per user", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 30 });
    const response = await POST(postRequest(validPayload));
    expect(response.status).toBe(429);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("candidateProperty", "user-1");
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an unsafe URL scheme", async () => {
    const response = await POST(postRequest({ ...validPayload, sourceUrl: "javascript:alert(1)" }));
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects a missing title", async () => {
    const response = await POST(postRequest({ ...validPayload, title: "" }));
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("creates the property scoped to the current user and never fetches sourceUrl itself", async () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    const response = await POST(postRequest(validPayload));

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: "user-1", sourceUrl: validPayload.sourceUrl }),
      }),
    );
    expect(fetchSpy).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });

  it("defaults status to 관심 when not provided", async () => {
    await POST(postRequest(validPayload));
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "관심" }) }),
    );
  });

  it("does not attempt geocoding when no address is given", async () => {
    await POST(postRequest(validPayload));
    expect(mocks.geocodeAddress).not.toHaveBeenCalled();
  });

  it("geocodes the address after creating, and caches the coordinates on the new row", async () => {
    mocks.geocodeAddress.mockResolvedValue({ lat: 37.5, lng: 127.0 });

    const response = await POST(postRequest({ ...validPayload, address: "서울특별시 강남구" }));

    expect(response.status).toBe(201);
    expect(mocks.geocodeAddress).toHaveBeenCalledWith("서울특별시 강남구");
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "candidate-1" },
      data: { latitude: 37.5, longitude: 127.0 },
    });
  });

  it("still returns 201 (registration already succeeded) when geocoding finds nothing", async () => {
    mocks.geocodeAddress.mockResolvedValue(null);
    const response = await POST(postRequest({ ...validPayload, address: "존재하지 않는 주소" }));
    expect(response.status).toBe(201);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("still returns 201 (core save unaffected) when geocoding itself throws", async () => {
    mocks.geocodeAddress.mockRejectedValue(new Error("map api down"));
    const response = await POST(postRequest({ ...validPayload, address: "서울특별시 강남구" }));
    expect(response.status).toBe(201);
  });
});
