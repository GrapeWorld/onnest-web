import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  membershipFindFirst: vi.fn(),
  membershipUpdate: vi.fn(),
  membershipCount: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerMembership: {
      findFirst: mocks.membershipFindFirst,
      findUnique: mocks.membershipFindFirst,
      update: mocks.membershipUpdate,
      count: mocks.membershipCount,
    },
    user: { update: mocks.userUpdate },
    $transaction: mocks.transaction,
  },
}));

import { PATCH } from "@/app/api/partner/team/members/[membershipId]/route";

function call(body: unknown, membershipId = "target-membership") {
  const request = new Request(`http://localhost/api/partner/team/members/${membershipId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ membershipId }) });
}

const ownerMembership = {
  id: "owner-membership",
  partnerId: "partner-1",
  userId: "owner-1",
  role: "OWNER",
  status: "ACTIVE",
  partner: { active: true, verificationStatus: "APPROVED" },
};

const targetStaffMembership = {
  id: "target-membership",
  partnerId: "partner-1",
  userId: "staff-1",
  role: "STAFF",
  status: "ACTIVE",
  partner: { active: true, verificationStatus: "APPROVED" },
};

describe("PATCH /api/partner/team/members/[membershipId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "owner-1",
      email: "owner@partner.example.com",
      memberType: "PARTNER",
      partnerId: "partner-1",
      adminRole: null,
      status: "ACTIVE",
    });
    // 첫 번째 findFirst 호출은 getActiveOwnerMembership()의 대표 확인용.
    mocks.membershipFindFirst.mockResolvedValue(ownerMembership);
    mocks.membershipCount.mockResolvedValue(1);
    mocks.membershipUpdate.mockResolvedValue({});
    mocks.userUpdate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        partnerMembership: {
          findUnique: mocks.membershipFindFirst,
          update: mocks.membershipUpdate,
          count: mocks.membershipCount,
          findFirst: mocks.membershipFindFirst,
        },
        user: { update: mocks.userUpdate },
      }),
    );
  });

  it("rejects a non-owner with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({ ...ownerMembership, role: "STAFF" });

    const response = await call({ role: "MANAGER" });
    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a body with both role and status", async () => {
    const response = await call({ role: "MANAGER", status: "SUSPENDED" });
    expect(response.status).toBe(400);
  });

  it("rejects a body with neither role nor status", async () => {
    const response = await call({});
    expect(response.status).toBe(400);
  });

  it("returns 404 for a membership belonging to a different company", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce({ ...targetStaffMembership, partnerId: "other-partner" });

    const response = await call({ role: "MANAGER" });
    expect(response.status).toBe(404);
  });

  it("changes a staff member's role", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(targetStaffMembership);

    const response = await call({ role: "MANAGER" });

    expect(response.status).toBe(200);
    expect(mocks.membershipUpdate).toHaveBeenCalledWith({
      where: { id: "target-membership" },
      data: { role: "MANAGER", status: "ACTIVE" },
    });
    // 일반 직원의 역할만 바뀌는 것이라 User 동기화는 필요 없다.
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });

  it("revokes a staff member and syncs User back to CUSTOMER", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(targetStaffMembership);

    const response = await call({ status: "REVOKED" });

    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      data: { memberType: "CUSTOMER", partnerId: null, authVersion: { increment: 1 } },
    });
  });

  it("blocks the owner from revoking themselves", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(ownerMembership);

    const response = await call({ status: "REVOKED" }, "owner-membership");
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("대표 본인을 해제할 수 없습니다");
    expect(mocks.membershipUpdate).not.toHaveBeenCalled();
  });

  it("blocks demoting the last remaining active owner", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce({ ...ownerMembership, id: "another-owner-membership" });
    mocks.membershipCount.mockResolvedValue(0);

    const response = await call({ role: "MANAGER" }, "another-owner-membership");
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("최소 한 명의 대표가 있어야 합니다.");
    expect(mocks.membershipUpdate).not.toHaveBeenCalled();
  });

  it("allows demoting an owner when another active owner exists", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce({ ...ownerMembership, id: "another-owner-membership" });
    mocks.membershipCount.mockResolvedValue(1);

    const response = await call({ role: "MANAGER" }, "another-owner-membership");
    expect(response.status).toBe(200);
  });

  it("blocks reactivating a membership when the user already has an active membership elsewhere", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce({ ...targetStaffMembership, status: "SUSPENDED" })
      .mockResolvedValueOnce({ id: "elsewhere-membership" });

    const response = await call({ status: "ACTIVE" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 다른 업체에 소속돼 있어 재활성화할 수 없습니다.");
    expect(mocks.membershipUpdate).not.toHaveBeenCalled();
  });

  it("reactivates a suspended membership and syncs User back to PARTNER", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce({ ...targetStaffMembership, status: "SUSPENDED" })
      .mockResolvedValueOnce(null);

    const response = await call({ status: "ACTIVE" });

    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "staff-1" },
      data: { memberType: "PARTNER", partnerId: "partner-1", authVersion: { increment: 1 } },
    });
  });

  it("returns 409 on a concurrent-conflict transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ role: "MANAGER" });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.");
  });
});
