import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requestFindUnique: vi.fn(),
  requestUpdate: vi.fn(),
  userFindUnique: vi.fn(),
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
    serviceRequest: { findUnique: mocks.requestFindUnique, update: mocks.requestUpdate },
    user: { findUnique: mocks.userFindUnique },
    serviceRequestActivity: { create: mocks.activityCreate },
    partnerMembership: { findFirst: mocks.membershipFindFirst },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));

import { PATCH } from "@/app/api/partner/service-requests/[id]/staff/route";

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/partner/service-requests/${id}/staff`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/partner/service-requests/[id]/staff", () => {
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
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: null,
    });
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "OWNER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.userFindUnique.mockResolvedValue({
      id: "staff-2",
      name: "이직원",
      partnerId: "partner-1",
      memberType: "PARTNER",
      status: "ACTIVE",
    });
    mocks.requestUpdate.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findUnique: mocks.requestFindUnique, update: mocks.requestUpdate },
        user: { findUnique: mocks.userFindUnique },
        serviceRequestActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await call({ partnerStaffId: "staff-2" });

    expect(response.status).toBe(403);
  });

  it("rejects a VIEWER with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "VIEWER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await call({ partnerStaffId: "staff-2" });
    expect(response.status).toBe(403);
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
  });

  it("rejects a STAFF assigned to the request itself with 403 (staff assignment is OWNER/MANAGER-only)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: "staff-1",
    });

    const response = await call({ partnerStaffId: "staff-2" });
    expect(response.status).toBe(403);
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
  });

  it("hides an unassigned STAFF's access as 404 (not their request)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
    });

    const response = await call({ partnerStaffId: "staff-2" });
    expect(response.status).toBe(404);
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
  });

  it("allows a MANAGER to assign staff", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "MANAGER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await call({ partnerStaffId: "staff-2" });
    expect(response.status).toBe(200);
  });

  it("assigns a same-company ACTIVE staff member and records STAFF_ASSIGNED", async () => {
    const response = await call({ partnerStaffId: "staff-2" });

    expect(response.status).toBe(200);
    expect(mocks.requestUpdate).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { partnerStaffId: "staff-2" },
    });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "STAFF_ASSIGNED",
        changes: { fromStaffId: null, toStaffId: "staff-2", toStaffName: "이직원" },
        actorRole: "PARTNER",
        partnerId: "partner-1",
      }),
    });
  });

  it("unassigns and records STAFF_UNASSIGNED", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: "staff-2",
    });

    const response = await call({ partnerStaffId: null });

    expect(response.status).toBe(200);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ action: "STAFF_UNASSIGNED" }),
    });
  });

  it("blocks assigning a staff member from a different company (hidden as not-found)", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "staff-2",
      name: "이직원",
      partnerId: "other-partner",
      memberType: "PARTNER",
      status: "ACTIVE",
    });

    const response = await call({ partnerStaffId: "staff-2" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("직원을 찾을 수 없습니다.");
    expect(mocks.requestUpdate).not.toHaveBeenCalled();
  });

  it("blocks assigning a non-partner user", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "staff-2",
      name: "고객",
      partnerId: "partner-1",
      memberType: "CUSTOMER",
      status: "ACTIVE",
    });

    const response = await call({ partnerStaffId: "staff-2" });

    expect(response.status).toBe(404);
  });

  it("blocks assigning a non-ACTIVE staff member", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "staff-2",
      name: "이직원",
      partnerId: "partner-1",
      memberType: "PARTNER",
      status: "PENDING",
    });

    const response = await call({ partnerStaffId: "staff-2" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("활성 상태(ACTIVE)의 직원만 담당자로 지정할 수 있습니다.");
  });

  it("returns 404 for a request belonging to a different partner", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "other-partner",
      partnerStaffId: null,
    });

    const response = await call({ partnerStaffId: "staff-2" });
    expect(response.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call({ partnerStaffId: "staff-2" });

    expect(response.status).toBe(429);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects assigning the same staff member again", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: "staff-2",
    });

    const response = await call({ partnerStaffId: "staff-2" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 같은 담당자입니다.");
  });
});
