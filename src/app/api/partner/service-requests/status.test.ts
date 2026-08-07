import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
  membershipFindFirst: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.findUnique, update: mocks.update },
    serviceRequestActivity: { create: mocks.activityCreate },
    partnerMembership: { findFirst: mocks.membershipFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));

import { PATCH } from "@/app/api/partner/service-requests/[id]/route";

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/partner/service-requests/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/partner/service-requests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-1",
      email: "staff@partner.example.com",
      name: "김직원",
      memberType: "PARTNER",
      partnerId: "partner-1",
      status: "ACTIVE",
    });
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      status: "신규",
      partnerId: "partner-1",
      partnerStaffId: null,
    });
    mocks.update.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "OWNER",
      partner: { active: true },
    });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findUnique: mocks.findUnique, update: mocks.update },
        serviceRequestActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await call({ status: "확인 중" });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call({ status: "확인 중" });

    expect(response.status).toBe(403);
  });

  it("rejects an invalid status", async () => {
    const response = await call({ status: "존재하지 않음" });
    expect(response.status).toBe(400);
  });

  it("rejects cancelling without a reason", async () => {
    const response = await call({ status: "취소" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("취소 사유");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("accepts cancelling with a reason and records it in the activity", async () => {
    const response = await call({ status: "취소", reason: "서비스 가능 지역 밖" });

    expect(response.status).toBe(200);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "STATUS_CHANGED",
        changes: { from: "신규", to: "취소", reason: "서비스 가능 지역 밖" },
        actorRole: "PARTNER",
        partnerId: "partner-1",
      }),
    });
  });

  it("changes status without a reason for non-cancel transitions", async () => {
    const response = await call({ status: "확인 중" });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { status: "확인 중" },
    });
  });

  it("returns 404 for a request belonging to a different partner (never leaks existence)", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      status: "신규",
      partnerId: "other-partner",
      partnerStaffId: null,
    });

    const response = await call({ status: "확인 중" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("요청을 찾을 수 없습니다.");
  });

  it("rejects a VIEWER with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "VIEWER",
      partner: { active: true },
    });

    const response = await call({ status: "확인 중" });
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("hides an unassigned STAFF's access as 404 (not their request)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true },
    });
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      status: "신규",
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
    });

    const response = await call({ status: "확인 중" });
    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows an assigned STAFF to change status", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true },
    });
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      status: "신규",
      partnerId: "partner-1",
      partnerStaffId: "staff-1",
    });

    const response = await call({ status: "확인 중" });
    expect(response.status).toBe(200);
  });

  it("returns 404 for a request that doesn't exist", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await call({ status: "확인 중" });
    expect(response.status).toBe(404);
  });

  it("rejects setting the same status", async () => {
    const response = await call({ status: "신규" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 상태입니다.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows skipping several steps forward", async () => {
    const response = await call({ status: "작업 예정" });
    expect(response.status).toBe(200);
  });

  it("rejects moving backward", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      status: "작업 예정",
      partnerId: "partner-1",
      partnerStaffId: null,
    });

    const response = await call({ status: "확인 중" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이 상태로는 변경할 수 없습니다.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects any change out of a terminal status (작업 완료)", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "request-1",
      status: "작업 완료",
      partnerId: "partner-1",
      partnerStaffId: null,
    });

    const response = await call({ status: "취소", reason: "요청 실수" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이 상태로는 변경할 수 없습니다.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call({ status: "확인 중" });

    expect(response.status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("runs inside a Serializable transaction", async () => {
    await call({ status: "확인 중" });

    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });

  it("returns 409 on a concurrent-conflict transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ status: "확인 중" });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.",
    );
  });
});
