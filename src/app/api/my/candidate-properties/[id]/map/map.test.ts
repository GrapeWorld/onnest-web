import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  fetchStaticMapImage: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { candidateProperty: { findFirst: mocks.findFirst } },
}));
vi.mock("@/lib/naverMap", () => ({ fetchStaticMapImage: mocks.fetchStaticMapImage }));

import { GET } from "@/app/api/my/candidate-properties/[id]/map/route";

function call(id = "candidate-1") {
  const request = new Request(`http://localhost/api/my/candidate-properties/${id}/map`);
  return GET(request, { params: Promise.resolve({ id }) });
}

describe("GET /api/my/candidate-properties/[id]/map", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(401);
    expect(mocks.findFirst).not.toHaveBeenCalled();
  });

  it("scopes the lookup to the current user's own row", async () => {
    mocks.findFirst.mockResolvedValue(null);
    await call();
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "candidate-1", userId: "user-1" } }),
    );
  });

  it("returns 404 without revealing whether the row exists for another user", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await call();
    expect(response.status).toBe(404);
    expect(mocks.fetchStaticMapImage).not.toHaveBeenCalled();
  });

  it("returns 404 when the candidate has no cached coordinates yet", async () => {
    mocks.findFirst.mockResolvedValue({ latitude: null, longitude: null });
    const response = await call();
    expect(response.status).toBe(404);
    expect(mocks.fetchStaticMapImage).not.toHaveBeenCalled();
  });

  it("never accepts client-supplied coordinates — only the DB-cached lat/lng for this owned row", async () => {
    mocks.findFirst.mockResolvedValue({ latitude: 37.5, longitude: 127.0 });
    mocks.fetchStaticMapImage.mockResolvedValue({ body: new ReadableStream(), contentType: "image/png" });

    await call();

    expect(mocks.fetchStaticMapImage).toHaveBeenCalledWith({ lat: 37.5, lng: 127.0 });
  });

  it("streams the image with the upstream content type on success", async () => {
    const body = new ReadableStream();
    mocks.findFirst.mockResolvedValue({ latitude: 37.5, longitude: 127.0 });
    mocks.fetchStaticMapImage.mockResolvedValue({ body, contentType: "image/png" });

    const response = await call();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
  });

  it("returns 502 (not a crash) when the upstream map fetch fails", async () => {
    mocks.findFirst.mockResolvedValue({ latitude: 37.5, longitude: 127.0 });
    mocks.fetchStaticMapImage.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(502);
  });
});
