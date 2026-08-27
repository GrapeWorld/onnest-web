import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  userUpdate: vi.fn(),
  historyCreate: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique, update: mocks.userUpdate },
    paymentTierHistory: { create: mocks.historyCreate },
    notification: { create: mocks.notificationCreate },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "@/app/api/admin/users/[id]/payment-tier/route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/users/user-1/payment-tier", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function call(body: unknown, targetId = "user-1") {
  return PATCH(request(body), { params: Promise.resolve({ id: targetId }) });
}

describe("PATCH /api/admin/users/[id]/payment-tier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      adminRole: "super",
    });
    mocks.findUnique.mockResolvedValue({ id: "user-1", paymentTier: "FREE" });
    mocks.userUpdate.mockResolvedValue({});
    mocks.historyCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { findUnique: mocks.findUnique, update: mocks.userUpdate },
        paymentTierHistory: { create: mocks.historyCreate },
        notification: { create: mocks.notificationCreate },
      }),
    );
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", adminRole: null });
    const response = await call({ toTier: "PREMIUM", reason: "테스트" });
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "viewer-1",
      email: "viewer@onnesthome.com",
      adminRole: "viewer",
    });
    const response = await call({ toTier: "PREMIUM", reason: "테스트" });
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid tier", async () => {
    const response = await call({ toTier: "GOLD", reason: "테스트" });
    expect(response.status).toBe(400);
  });

  it("rejects a missing reason", async () => {
    const response = await call({ toTier: "PREMIUM", reason: "" });
    expect(response.status).toBe(400);
  });

  it("rejects a reason longer than 500 characters", async () => {
    const response = await call({ toTier: "PREMIUM", reason: "a".repeat(501) });
    expect(response.status).toBe(400);
  });

  it("rejects changing to the current tier", async () => {
    const response = await call({ toTier: "FREE", reason: "테스트" });
    const data = await response.json();
    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 결제 등급입니다.");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user no longer exists", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await call({ toTier: "PREMIUM", reason: "테스트" });
    const data = await response.json();
    expect(response.status).toBe(404);
    expect(data.error).toBe("회원을 찾을 수 없습니다.");
  });

  it("applies a valid tier change and records history", async () => {
    const response = await call({ toTier: "PREMIUM", reason: "상담 후 결제 확인" });
    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { paymentTier: "PREMIUM" },
    });
    expect(mocks.historyCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        fromTier: "FREE",
        toTier: "PREMIUM",
        reason: "상담 후 결제 확인",
        adminId: "admin-1",
        adminEmail: "admin@onnesthome.com",
      },
    });
  });

  it("does not require the last-super or login-block checks that member status uses", async () => {
    // 결제 등급은 로그인·권한에 영향을 주지 않으므로 최고관리자 계정이어도
    // 아무 제약 없이 바뀐다(상태 변경 라우트와의 의도적인 차이).
    mocks.findUnique.mockResolvedValue({ id: "admin-1", paymentTier: "FREE" });
    const response = await call({ toTier: "PREMIUM", reason: "테스트" }, "admin-1");
    expect(response.status).toBe(200);
  });

  it("returns 409 when the transaction fails due to a concurrent conflict", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));
    const response = await call({ toTier: "PREMIUM", reason: "테스트" });
    const data = await response.json();
    expect(response.status).toBe(409);
    expect(data.error).toBe("다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.");
  });
});
