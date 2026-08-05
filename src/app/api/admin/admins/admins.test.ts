import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  count: vi.fn(),
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
    user: { findUnique: mocks.findUnique, count: mocks.count, update: mocks.userUpdate },
    adminRoleHistory: { create: mocks.historyCreate },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "@/app/api/admin/admins/[id]/route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/admins/target-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function call(body: unknown, targetId = "target-1") {
  return PATCH(request(body), { params: Promise.resolve({ id: targetId }) });
}

describe("PATCH /api/admin/admins/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "actor-1",
      email: "super@onnesthome.com",
      adminRole: "super",
    });
    mocks.findUnique.mockResolvedValue({ id: "target-1", adminRole: null });
    mocks.count.mockResolvedValue(1);
    mocks.userUpdate.mockResolvedValue({});
    mocks.historyCreate.mockResolvedValue({});
    // 실제 라우트는 인터랙티브 트랜잭션(콜백)을 쓴다 — tx가 곧 prisma mock과
    // 같은 함수들을 쓰도록 흉내낸다.
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        user: { findUnique: mocks.findUnique, count: mocks.count, update: mocks.userUpdate },
        adminRoleHistory: { create: mocks.historyCreate },
      }),
    );
  });

  it("rejects viewer-grade actors with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({ toRole: "super", reason: "테스트" });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid toRole", async () => {
    const response = await call({ toRole: "owner", reason: "테스트" });
    expect(response.status).toBe(400);
  });

  it("rejects a missing reason", async () => {
    const response = await call({ toRole: "viewer", reason: "" });
    expect(response.status).toBe(400);
  });

  it("blocks an actor from changing their own admin role", async () => {
    const response = await call({ toRole: "viewer", reason: "테스트" }, "actor-1");
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("자기 자신의 권한은 변경할 수 없습니다.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects setting the same role the target already has", async () => {
    mocks.findUnique.mockResolvedValue({ id: "target-1", adminRole: "viewer" });

    const response = await call({ toRole: "viewer", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 권한입니다.");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("returns 404 when the target no longer exists", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await call({ toRole: "viewer", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("회원을 찾을 수 없습니다.");
  });

  it("blocks demoting the last remaining super admin", async () => {
    mocks.findUnique.mockResolvedValue({ id: "target-1", adminRole: "super" });
    mocks.count.mockResolvedValue(0);

    const response = await call({ toRole: "viewer", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("마지막 남은 최고관리자는 권한을 낮추거나 회수할 수 없습니다.");
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("allows demoting a super admin when another super admin remains", async () => {
    mocks.findUnique.mockResolvedValue({ id: "target-1", adminRole: "super" });
    mocks.count.mockResolvedValue(1);

    const response = await call({ toRole: "viewer", reason: "역할 재조정" });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });

  it("promotes a non-admin member to viewer", async () => {
    const response = await call({ toRole: "viewer", reason: "CS 지원" });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("revokes an admin's access (toRole: null)", async () => {
    mocks.findUnique.mockResolvedValue({ id: "target-1", adminRole: "viewer" });

    const response = await call({ toRole: null, reason: "퇴사" });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it("returns 409 when the transaction fails due to a concurrent conflict", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ toRole: "viewer", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.",
    );
  });
});
