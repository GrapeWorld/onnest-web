import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  actionItemUpdateMany: vi.fn(),
  transaction: vi.fn(),
  geocodeAddress: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectPropertySuggestion: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
      updateMany: mocks.updateMany,
    },
    actionItem: { updateMany: mocks.actionItemUpdateMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/naverMap", () => ({ geocodeAddress: mocks.geocodeAddress }));

import { PATCH as PATCH_EDIT } from "@/app/api/admin/property-suggestions/[id]/route";
import { PATCH as PATCH_WITHDRAW } from "@/app/api/admin/property-suggestions/[id]/withdraw/route";

const params = Promise.resolve({ id: "suggestion-1" });
const validInput = {
  sourceUrl: "https://fin.land.naver.com/complexes/123",
  title: "거제 아파트",
};

function editRequest(body: unknown) {
  return new Request("http://localhost/api/admin/property-suggestions/suggestion-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/property-suggestions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", projectId: "project-1", withdrawnAt: null, address: null });
    mocks.findFirst.mockResolvedValue(null);
    mocks.update.mockResolvedValue({});
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.geocodeAddress.mockResolvedValue(null);
  });

  it("rejects a viewer-only admin", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "viewer" });
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("404s for an unknown suggestion", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(404);
  });

  it("blocks editing an already withdrawn suggestion", async () => {
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", projectId: "project-1", withdrawnAt: new Date() });
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("blocks changing sourceUrl to one already shared in the same project", async () => {
    mocks.findFirst.mockResolvedValue({ id: "other-suggestion" });
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates fields for a valid edit", async () => {
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "suggestion-1" } }),
    );
  });

  it("does not re-geocode when the address is unchanged", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "suggestion-1",
      projectId: "project-1",
      withdrawnAt: null,
      address: "경상남도 거제시",
    });
    const response = await PATCH_EDIT(editRequest({ ...validInput, address: "경상남도 거제시" }), { params });
    expect(response.status).toBe(200);
    expect(mocks.geocodeAddress).not.toHaveBeenCalled();
  });

  it("clears cached coordinates and re-geocodes when the address changes", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "suggestion-1",
      projectId: "project-1",
      withdrawnAt: null,
      address: "경상남도 거제시",
    });
    mocks.geocodeAddress.mockResolvedValue({ lat: 34.88, lng: 128.62 });

    const response = await PATCH_EDIT(editRequest({ ...validInput, address: "서울특별시 강남구" }), { params });

    expect(response.status).toBe(200);
    // 1차 update에서 주소 변경과 함께 기존 좌표를 즉시 지운다.
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "suggestion-1" },
        data: expect.objectContaining({ latitude: null, longitude: null }),
      }),
    );
    expect(mocks.geocodeAddress).toHaveBeenCalledWith("서울특별시 강남구");
    // 좌표 캐시 반영은 update가 아니라 조건부 updateMany를 쓴다 — 조회하는
    // 사이 주소가 또 바뀌었으면(경합) 이 결과를 반영하지 않는다(아래
    // "stale" 테스트).
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "suggestion-1", address: "서울특별시 강남구" },
      data: { latitude: 34.88, longitude: 128.62 },
    });
  });

  it("discards a stale geocode result without erroring when the address changed again before it resolved(count 0)", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "suggestion-1",
      projectId: "project-1",
      withdrawnAt: null,
      address: "경상남도 거제시",
    });
    mocks.geocodeAddress.mockResolvedValue({ lat: 34.88, lng: 128.62 });
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const response = await PATCH_EDIT(editRequest({ ...validInput, address: "서울특별시 강남구" }), { params });

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: "suggestion-1", address: "서울특별시 강남구" },
      data: { latitude: 34.88, longitude: 128.62 },
    });
  });

  it("clears cached coordinates without re-geocoding when the address is removed", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "suggestion-1",
      projectId: "project-1",
      withdrawnAt: null,
      address: "경상남도 거제시",
    });
    const response = await PATCH_EDIT(editRequest({ ...validInput, address: "" }), { params });
    expect(response.status).toBe(200);
    expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ latitude: null, longitude: null }) }),
    );
  });

  it("still returns 200 (edit unaffected) when geocoding itself throws", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "suggestion-1",
      projectId: "project-1",
      withdrawnAt: null,
      address: "경상남도 거제시",
    });
    mocks.geocodeAddress.mockRejectedValue(new Error("map api down"));
    const response = await PATCH_EDIT(editRequest({ ...validInput, address: "서울특별시 강남구" }), { params });
    expect(response.status).toBe(200);
  });
});

describe("PATCH /api/admin/property-suggestions/[id]/withdraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", withdrawnAt: null });
    mocks.update.mockResolvedValue({});
    mocks.actionItemUpdateMany.mockResolvedValue({ count: 0 });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        projectPropertySuggestion: { update: mocks.update },
        actionItem: { updateMany: mocks.actionItemUpdateMany },
      }),
    );
  });

  function withdrawRequest() {
    return new Request("http://localhost/api/admin/property-suggestions/suggestion-1/withdraw", {
      method: "PATCH",
    });
  }

  it("rejects a viewer-only admin", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "viewer" });
    const response = await PATCH_WITHDRAW(withdrawRequest(), { params });
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("soft-deletes by setting withdrawnAt, not a real delete", async () => {
    const response = await PATCH_WITHDRAW(withdrawRequest(), { params });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "suggestion-1" },
      data: { withdrawnAt: expect.any(Date) },
    });
  });

  it("rejects withdrawing an already-withdrawn suggestion", async () => {
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", withdrawnAt: new Date() });
    const response = await PATCH_WITHDRAW(withdrawRequest(), { params });
    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
