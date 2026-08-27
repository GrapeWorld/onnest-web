import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
  userUpdate: vi.fn(),
  historyCreate: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique, count: mocks.count, update: mocks.userUpdate },
    memberStatusHistory: { create: mocks.historyCreate },
    notification: { create: mocks.notificationCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  sendEmail: mocks.sendEmail,
}));

import { PATCH } from "@/app/api/admin/users/[id]/status/route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/users/user-1/status", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function call(body: unknown, targetId = "user-1") {
  return PATCH(request(body), { params: Promise.resolve({ id: targetId }) });
}

describe("PATCH /api/admin/users/[id]/status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      adminRole: "super",
    });
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      status: "ACTIVE",
      adminRole: null,
      email: "user-1@example.com",
      name: "회원1",
    });
    mocks.count.mockResolvedValue(1);
    mocks.userUpdate.mockResolvedValue({});
    mocks.historyCreate.mockResolvedValue({});
    mocks.notificationCreate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue({ sent: true });
    // 실제 라우트는 인터랙티브 트랜잭션(콜백)을 쓴다 — tx가 곧 prisma mock과
    // 같은 함수들을 쓰도록 흉내낸다.
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { findUnique: mocks.findUnique, count: mocks.count, update: mocks.userUpdate },
        memberStatusHistory: { create: mocks.historyCreate },
        notification: { create: mocks.notificationCreate },
      }),
    );
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", adminRole: null });

    const response = await call({ toStatus: "SUSPENDED", reason: "테스트" });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "viewer-1",
      email: "viewer@onnesthome.com",
      adminRole: "viewer",
    });

    const response = await call({ toStatus: "SUSPENDED", reason: "테스트" });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid toStatus", async () => {
    const response = await call({ toStatus: "NOT_A_STATUS", reason: "테스트" });
    expect(response.status).toBe(400);
  });

  it("rejects a missing reason", async () => {
    const response = await call({ toStatus: "SUSPENDED", reason: "" });
    expect(response.status).toBe(400);
  });

  it("rejects a reason longer than 500 characters", async () => {
    const response = await call({
      toStatus: "SUSPENDED",
      reason: "a".repeat(501),
    });
    expect(response.status).toBe(400);
  });

  it("rejects changing to the current status", async () => {
    const response = await call({ toStatus: "ACTIVE", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 상태입니다.");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user no longer exists", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await call({ toStatus: "SUSPENDED", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("회원을 찾을 수 없습니다.");
  });

  it("applies a valid status change in a transaction and bumps authVersion", async () => {
    const response = await call({ toStatus: "SUSPENDED", reason: "결제 미납" });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { status: "SUSPENDED", authVersion: { increment: 1 } },
    });
    expect(mocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ recipientUserId: "user-1", type: "MEMBER_STATUS_CHANGED" }) }),
    );
  });

  it("emails the target when the new status blocks login", async () => {
    const response = await call({ toStatus: "SUSPENDED", reason: "결제 미납" });

    expect(response.status).toBe(200);
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user-1@example.com" }),
    );
  });

  it("does not email the target when the new status doesn't block login", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      status: "ACTIVE",
      adminRole: null,
      email: "user-1@example.com",
      name: "회원1",
    });

    const response = await call({ toStatus: "DORMANT", reason: "장기 미접속" });

    expect(response.status).toBe(200);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("a failed notification email doesn't fail the request", async () => {
    mocks.sendEmail.mockRejectedValue(new Error("resend down"));

    const response = await call({ toStatus: "SUSPENDED", reason: "결제 미납" });

    expect(response.status).toBe(200);
  });

  it("blocks an admin from changing their own status", async () => {
    const response = await call(
      { toStatus: "SUSPENDED", reason: "테스트" },
      "admin-1",
    );
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("자기 자신의 상태는 변경할 수 없습니다.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("blocks suspending the last remaining active super admin", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      status: "ACTIVE",
      adminRole: "super",
    });
    mocks.count.mockResolvedValue(0);

    const response = await call({ toStatus: "SUSPENDED", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "마지막 남은 활성 최고관리자는 이용을 제한할 수 없습니다.",
    );
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("allows suspending a super admin when another active super remains", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      status: "ACTIVE",
      adminRole: "super",
    });
    mocks.count.mockResolvedValue(1);

    const response = await call({ toStatus: "SUSPENDED", reason: "테스트" });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("allows a status change for a super admin that doesn't block login (no last-super check)", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "user-1",
      status: "ACTIVE",
      adminRole: "super",
    });
    mocks.count.mockResolvedValue(0);

    const response = await call({ toStatus: "DORMANT", reason: "장기 미접속" });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when the transaction fails due to a concurrent conflict", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ toStatus: "SUSPENDED", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.",
    );
  });
});
