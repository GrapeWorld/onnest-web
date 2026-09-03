import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  updateMany: vi.fn(),
  deleteFn: vi.fn(),
  transaction: vi.fn(),
  checkRateLimit: vi.fn(),
  geocodeAddress: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    candidateProperty: {
      findFirst: mocks.findFirst,
      update: mocks.update,
      updateMany: mocks.updateMany,
      delete: mocks.deleteFn,
    },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: (s: number) => `${s}초`,
}));
vi.mock("@/lib/naverMap", () => ({ geocodeAddress: mocks.geocodeAddress }));

import { PATCH, DELETE } from "@/app/api/my/candidate-properties/[id]/route";

function patchRequest(body: unknown, id = "candidate-1") {
  const request = new Request(`http://localhost/api/my/candidate-properties/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

function deleteRequest(id = "candidate-1") {
  const request = new Request(`http://localhost/api/my/candidate-properties/${id}`, { method: "DELETE" });
  return DELETE(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/my/candidate-properties/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.findFirst.mockResolvedValue({ id: "candidate-1", status: "관심", address: "기존 주소" });
    mocks.update.mockResolvedValue({ id: "candidate-1" });
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.geocodeAddress.mockResolvedValue(null);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        candidateProperty: { findFirst: mocks.findFirst, update: mocks.update },
      }),
    );
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await patchRequest({ title: "새 이름" });
    expect(response.status).toBe(401);
  });

  it("scopes the lookup to the current user's own row", async () => {
    await patchRequest({ title: "새 이름" });
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "candidate-1", userId: "user-1" } }),
    );
  });

  it("returns 404 without revealing whether the row exists for another user", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await patchRequest({ title: "새 이름" });
    const data = await response.json();
    expect(response.status).toBe(404);
    expect(data.error).toBe("매물 후보를 찾을 수 없습니다.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid transactionType", async () => {
    const response = await patchRequest({ transactionType: "임의값" });
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("stamps selectedAt only on the transition into 최종 후보", async () => {
    await patchRequest({ status: "최종 후보" });
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "최종 후보", selectedAt: expect.any(Date) }) }),
    );
  });

  it("does not re-stamp selectedAt when already 최종 후보", async () => {
    mocks.findFirst.mockResolvedValue({ id: "candidate-1", status: "최종 후보" });
    await patchRequest({ memo: "메모 수정" });
    const call = mocks.update.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("selectedAt");
  });

  describe("주소 변경 시 좌표 재조회", () => {
    it("does not re-geocode when address is not part of the patch", async () => {
      await patchRequest({ memo: "메모만 수정" });
      expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    });

    it("does not re-geocode when the new address equals the existing one", async () => {
      await patchRequest({ address: "기존 주소" });
      expect(mocks.geocodeAddress).not.toHaveBeenCalled();
    });

    it("clears the cached coordinates immediately (inside the same update) when the address changes", async () => {
      await patchRequest({ address: "새 주소" });
      const inTransactionUpdate = mocks.update.mock.calls[0][0];
      expect(inTransactionUpdate.data).toMatchObject({ address: "새 주소", latitude: null, longitude: null });
    });

    it("re-geocodes the new address and caches fresh coordinates after the transaction commits", async () => {
      mocks.geocodeAddress.mockResolvedValue({ lat: 37.5, lng: 127.0 });

      const response = await patchRequest({ address: "새 주소" });

      expect(response.status).toBe(200);
      expect(mocks.geocodeAddress).toHaveBeenCalledWith("새 주소");
      // update가 아니라 조건부 updateMany를 쓴다 — 조회하는 사이 주소가 또
      // 바뀌었으면 이 결과를 반영하지 않는다(아래 "stale" 테스트).
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: "candidate-1", address: "새 주소" },
        data: { latitude: 37.5, longitude: 127.0 },
      });
    });

    it("discards a stale geocode result without erroring when the address changed again before it resolved(count 0)", async () => {
      mocks.geocodeAddress.mockResolvedValue({ lat: 37.5, lng: 127.0 });
      mocks.updateMany.mockResolvedValue({ count: 0 });

      const response = await patchRequest({ address: "새 주소" });

      expect(response.status).toBe(200);
      expect(mocks.updateMany).toHaveBeenCalledWith({
        where: { id: "candidate-1", address: "새 주소" },
        data: { latitude: 37.5, longitude: 127.0 },
      });
    });

    it("does not call geocodeAddress when the address is cleared to empty", async () => {
      const response = await patchRequest({ address: "" });
      expect(response.status).toBe(200);
      expect(mocks.geocodeAddress).not.toHaveBeenCalled();
      // 주소 자체를 지운 업데이트에는 좌표도 함께 null로 지워져 있어야 한다.
      const inTransactionUpdate = mocks.update.mock.calls[0][0];
      expect(inTransactionUpdate.data).toMatchObject({ address: null, latitude: null, longitude: null });
    });

    it("still returns 200 (core update already committed) when geocoding fails", async () => {
      mocks.geocodeAddress.mockRejectedValue(new Error("map api down"));
      const response = await patchRequest({ address: "새 주소" });
      expect(response.status).toBe(200);
    });
  });
});

describe("DELETE /api/my/candidate-properties/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await deleteRequest();
    expect(response.status).toBe(401);
  });

  it("blocks deleting another user's candidate property", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await deleteRequest();
    expect(response.status).toBe(404);
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });

  it("deletes only after confirming ownership", async () => {
    mocks.findFirst.mockResolvedValue({ id: "candidate-1" });
    const response = await deleteRequest();
    expect(response.status).toBe(200);
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "candidate-1", userId: "user-1" } }),
    );
    expect(mocks.deleteFn).toHaveBeenCalledWith({ where: { id: "candidate-1" } });
  });

  it("is rate limited per user", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 10 });
    const response = await deleteRequest();
    expect(response.status).toBe(429);
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });
});
