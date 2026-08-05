import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  partnerFindUnique: vi.fn(),
  userUpdate: vi.fn(),
  historyCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
    partner: { findUnique: mocks.partnerFindUnique },
    memberTypeHistory: { create: mocks.historyCreate },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "@/app/api/admin/users/[id]/member-type/route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/users/user-1/member-type", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function call(body: unknown, targetId = "user-1") {
  return PATCH(request(body), { params: Promise.resolve({ id: targetId }) });
}

describe("PATCH /api/admin/users/[id]/member-type", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      adminRole: "super",
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      memberType: "CUSTOMER",
      partnerId: null,
    });
    mocks.partnerFindUnique.mockResolvedValue({ id: "partner-1", active: true });
    mocks.userUpdate.mockResolvedValue({});
    mocks.historyCreate.mockResolvedValue({});
    // 실제 라우트는 인터랙티브 트랜잭션(콜백)을 쓴다 — tx가 곧 prisma mock과
    // 같은 함수들을 쓰도록 흉내낸다.
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { findUnique: mocks.userFindUnique, update: mocks.userUpdate },
        partner: { findUnique: mocks.partnerFindUnique },
        memberTypeHistory: { create: mocks.historyCreate },
      }),
    );
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", adminRole: null });

    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "테스트",
    });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "테스트",
    });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a missing reason", async () => {
    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "",
    });
    expect(response.status).toBe(400);
  });

  it("rejects PARTNER without a partnerId", async () => {
    const response = await call({ memberType: "PARTNER", reason: "테스트" });
    expect(response.status).toBe(400);
  });

  it("changes CUSTOMER to PARTNER and connects the partner", async () => {
    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "제휴 계약 체결",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ id: "user-1", memberType: "PARTNER", partnerId: "partner-1" });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { memberType: "PARTNER", partnerId: "partner-1", authVersion: { increment: 1 } },
    });
    expect(mocks.historyCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        fromType: "CUSTOMER",
        toType: "PARTNER",
        fromPartnerId: null,
        toPartnerId: "partner-1",
        reason: "제휴 계약 체결",
        actorId: "admin-1",
        actorEmail: "admin@onnesthome.com",
      },
    });
  });

  it("changes PARTNER back to CUSTOMER and clears partnerId even if one is sent", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      memberType: "PARTNER",
      partnerId: "partner-1",
    });

    const response = await call({
      memberType: "CUSTOMER",
      partnerId: "some-other-partner",
      reason: "제휴 계약 종료",
    });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ id: "user-1", memberType: "CUSTOMER", partnerId: null });
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { memberType: "CUSTOMER", partnerId: null, authVersion: { increment: 1 } },
    });
  });

  it("blocks connecting to a non-existent partner with 404", async () => {
    mocks.partnerFindUnique.mockResolvedValue(null);

    const response = await call({
      memberType: "PARTNER",
      partnerId: "missing-partner",
      reason: "테스트",
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("업체를 찾을 수 없습니다.");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("blocks a new connection to an inactive partner with 400", async () => {
    mocks.partnerFindUnique.mockResolvedValue({ id: "partner-1", active: false });

    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "테스트",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("연결할 수 없는 업체입니다.");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user no longer exists", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "테스트",
    });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("회원을 찾을 수 없습니다.");
  });

  it("rejects setting the same type and partner the target already has", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-1",
      memberType: "PARTNER",
      partnerId: "partner-1",
    });

    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "테스트",
    });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 회원 구분입니다.");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
    // 같은 값이면 활성 상태를 다시 검사할 필요조차 없다 — 업체 조회 자체가 없어야 한다.
    expect(mocks.partnerFindUnique).not.toHaveBeenCalled();
  });

  it("rejects setting the same CUSTOMER type the target already has", async () => {
    const response = await call({ memberType: "CUSTOMER", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 회원 구분입니다.");
  });

  it("returns 409 when the transaction fails due to a concurrent conflict", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({
      memberType: "PARTNER",
      partnerId: "partner-1",
      reason: "테스트",
    });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.",
    );
  });

  it("runs the update inside a Serializable transaction (closes the concurrent-edit race)", async () => {
    await call({ memberType: "PARTNER", partnerId: "partner-1", reason: "테스트" });

    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });
});
