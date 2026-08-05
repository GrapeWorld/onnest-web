import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  handoverUpdate: vi.fn(),
  historyCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    handover: { findUnique: mocks.findUnique, update: mocks.handoverUpdate },
    handoverModerationHistory: { create: mocks.historyCreate },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "@/app/api/admin/handovers/[id]/moderation/route";

function call(body: unknown, id = "handover-1") {
  const request = new Request(`http://localhost/api/admin/handovers/${id}/moderation`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/admin/handovers/[id]/moderation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      adminRole: "super",
    });
    mocks.findUnique.mockResolvedValue({ id: "handover-1", moderationStatus: "pending" });
    mocks.handoverUpdate.mockResolvedValue({});
    mocks.historyCreate.mockResolvedValue({});
    mocks.transaction.mockResolvedValue([{}, {}]);
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({ toStatus: "approved", reason: "테스트" });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid toStatus", async () => {
    const response = await call({ toStatus: "not_a_status", reason: "테스트" });
    expect(response.status).toBe(400);
  });

  it("rejects a missing reason", async () => {
    const response = await call({ toStatus: "approved", reason: "" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing handover", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await call({ toStatus: "approved", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("인수인계서를 찾을 수 없습니다.");
  });

  it("rejects changing to the current status", async () => {
    const response = await call({ toStatus: "pending", reason: "테스트" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 상태입니다.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("approves a pending handover and records history", async () => {
    const response = await call({ toStatus: "approved", reason: "내용 확인 완료" });

    expect(response.status).toBe(200);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.handoverUpdate).toHaveBeenCalledWith({
      where: { id: "handover-1" },
      data: expect.objectContaining({
        moderationStatus: "approved",
        moderationReason: "내용 확인 완료",
        moderatorId: "admin-1",
        moderatorEmail: "admin@onnesthome.com",
      }),
    });
    expect(mocks.historyCreate).toHaveBeenCalledWith({
      data: {
        handoverId: "handover-1",
        fromStatus: "pending",
        toStatus: "approved",
        reason: "내용 확인 완료",
        actorId: "admin-1",
        actorEmail: "admin@onnesthome.com",
      },
    });
  });

  it("clears visibility and shareToken when hiding a handover", async () => {
    mocks.findUnique.mockResolvedValue({ id: "handover-1", moderationStatus: "approved" });

    await call({ toStatus: "hidden", reason: "부적절한 표현 포함" });

    expect(mocks.handoverUpdate).toHaveBeenCalledWith({
      where: { id: "handover-1" },
      data: expect.objectContaining({
        moderationStatus: "hidden",
        visibility: "private",
        shareToken: null,
      }),
    });
  });

  it("does not touch visibility/shareToken for non-hidden transitions", async () => {
    const response = await call({ toStatus: "revision_requested", reason: "개인정보 노출" });
    expect(response.status).toBe(200);

    const call1 = mocks.handoverUpdate.mock.calls[0][0];
    expect(call1.data.visibility).toBeUndefined();
    expect(call1.data.shareToken).toBeUndefined();
  });
});
