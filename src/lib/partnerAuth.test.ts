import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  membershipFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerMembership: { findFirst: mocks.membershipFindFirst },
  },
}));
// partnerAuth.ts는 최상단에서 @/lib/auth를 import한다 — 실제 모듈은
// @/lib/session의 SESSION_SECRET 검증을 거치므로, 이 파일에서 테스트하지
// 않는 requirePartnerStaff() 등을 위해서도 매번 모킹이 필요하다.
vi.mock("@/lib/auth", () => ({ getCurrentUser: vi.fn() }));

import {
  isPartnerStaff,
  getActiveMembership,
  evaluateServiceRequestWriteAccess,
  evaluateServiceRequestReadAccess,
  evaluateStaffAssignmentAccess,
  type ActiveMembership,
} from "@/lib/partnerAuth";

describe("isPartnerStaff", () => {
  it("returns true for a PARTNER member with a connected partnerId", () => {
    expect(isPartnerStaff({ memberType: "PARTNER", partnerId: "partner-1" })).toBe(true);
  });

  it("returns false for a CUSTOMER member", () => {
    expect(isPartnerStaff({ memberType: "CUSTOMER", partnerId: null })).toBe(false);
  });

  it("returns false for a PARTNER member without a connected partnerId", () => {
    expect(isPartnerStaff({ memberType: "PARTNER", partnerId: null })).toBe(false);
  });
});

describe("getActiveMembership", () => {
  const user = { id: "user-1", status: "ACTIVE", memberType: "PARTNER", partnerId: "partner-1" };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null for a non-partner-staff account without querying the DB", async () => {
    const result = await getActiveMembership({ ...user, memberType: "CUSTOMER", partnerId: null });
    expect(result).toBeNull();
    expect(mocks.membershipFindFirst).not.toHaveBeenCalled();
  });

  it("returns null for a suspended/deleted account (User.status !== ACTIVE)", async () => {
    const result = await getActiveMembership({ ...user, status: "SUSPENDED" });
    expect(result).toBeNull();
    expect(mocks.membershipFindFirst).not.toHaveBeenCalled();
  });

  it("returns null when there's no ACTIVE membership row", async () => {
    mocks.membershipFindFirst.mockResolvedValue(null);
    const result = await getActiveMembership(user);
    expect(result).toBeNull();
  });

  it("returns null when the partner itself is inactive", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "OWNER",
      partner: { active: false },
    });
    const result = await getActiveMembership(user);
    expect(result).toBeNull();
  });

  it.each(["PENDING", "REJECTED", "SUSPENDED"])(
    "returns null when the partner's verification status is %s (not yet APPROVED)",
    async (verificationStatus) => {
      mocks.membershipFindFirst.mockResolvedValue({
        id: "membership-1",
        partnerId: "partner-1",
        role: "OWNER",
        partner: { active: true, verificationStatus },
      });
      const result = await getActiveMembership(user);
      expect(result).toBeNull();
    },
  );

  it("returns the membership when the account, partner, and membership are all active", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "MANAGER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    const result = await getActiveMembership(user);
    expect(result).toEqual({ id: "membership-1", partnerId: "partner-1", role: "MANAGER" });
  });
});

describe("evaluateServiceRequestWriteAccess", () => {
  const userId = "user-1";
  const membership = (role: ActiveMembership["role"]): ActiveMembership => ({
    id: "membership-1",
    partnerId: "partner-1",
    role,
  });

  it("hides a different company's request as notfound", () => {
    const result = evaluateServiceRequestWriteAccess(membership("OWNER"), userId, {
      partnerId: "other-partner",
      partnerStaffId: null,
    });
    expect(result).toEqual({ ok: false, reason: "notfound" });
  });

  it("allows OWNER to write regardless of assignment", () => {
    const result = evaluateServiceRequestWriteAccess(membership("OWNER"), userId, {
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
    });
    expect(result).toEqual({ ok: true, role: "OWNER", isAssignedStaff: false });
  });

  it("allows MANAGER to write regardless of assignment", () => {
    const result = evaluateServiceRequestWriteAccess(membership("MANAGER"), userId, {
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
    });
    expect(result).toEqual({ ok: true, role: "MANAGER", isAssignedStaff: false });
  });

  it("allows an assigned STAFF to write", () => {
    const result = evaluateServiceRequestWriteAccess(membership("STAFF"), userId, {
      partnerId: "partner-1",
      partnerStaffId: userId,
    });
    expect(result).toEqual({ ok: true, role: "STAFF", isAssignedStaff: true });
  });

  it("hides a non-assigned STAFF's request as notfound (same as an invisible request)", () => {
    const result = evaluateServiceRequestWriteAccess(membership("STAFF"), userId, {
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
    });
    expect(result).toEqual({ ok: false, reason: "notfound" });
  });

  it("forbids VIEWER from writing to a visible request", () => {
    const result = evaluateServiceRequestWriteAccess(membership("VIEWER"), userId, {
      partnerId: "partner-1",
      partnerStaffId: null,
    });
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });
});

describe("evaluateServiceRequestReadAccess", () => {
  const userId = "user-1";
  const membership = (role: ActiveMembership["role"]): ActiveMembership => ({
    id: "membership-1",
    partnerId: "partner-1",
    role,
  });

  it("hides a different company's request", () => {
    expect(
      evaluateServiceRequestReadAccess(membership("VIEWER"), userId, {
        partnerId: "other-partner",
        partnerStaffId: null,
      }),
    ).toBe(false);
  });

  it("lets VIEWER read every request in the company", () => {
    expect(
      evaluateServiceRequestReadAccess(membership("VIEWER"), userId, {
        partnerId: "partner-1",
        partnerStaffId: "someone-else",
      }),
    ).toBe(true);
  });

  it("lets OWNER/MANAGER read every request in the company", () => {
    expect(
      evaluateServiceRequestReadAccess(membership("OWNER"), userId, {
        partnerId: "partner-1",
        partnerStaffId: "someone-else",
      }),
    ).toBe(true);
  });

  it("lets an assigned STAFF read their own request", () => {
    expect(
      evaluateServiceRequestReadAccess(membership("STAFF"), userId, {
        partnerId: "partner-1",
        partnerStaffId: userId,
      }),
    ).toBe(true);
  });

  it("blocks a non-assigned STAFF from reading someone else's request", () => {
    expect(
      evaluateServiceRequestReadAccess(membership("STAFF"), userId, {
        partnerId: "partner-1",
        partnerStaffId: "someone-else",
      }),
    ).toBe(false);
  });
});

describe("evaluateStaffAssignmentAccess", () => {
  const userId = "user-1";
  const membership = (role: ActiveMembership["role"]): ActiveMembership => ({
    id: "membership-1",
    partnerId: "partner-1",
    role,
  });

  it("hides a different company's request as notfound", () => {
    const result = evaluateStaffAssignmentAccess(membership("OWNER"), userId, {
      partnerId: "other-partner",
      partnerStaffId: null,
    });
    expect(result).toEqual({ ok: false, reason: "notfound" });
  });

  it("allows OWNER to manage staff assignment", () => {
    const result = evaluateStaffAssignmentAccess(membership("OWNER"), userId, {
      partnerId: "partner-1",
      partnerStaffId: null,
    });
    expect(result.ok).toBe(true);
  });

  it("allows MANAGER to manage staff assignment", () => {
    const result = evaluateStaffAssignmentAccess(membership("MANAGER"), userId, {
      partnerId: "partner-1",
      partnerStaffId: null,
    });
    expect(result.ok).toBe(true);
  });

  it("forbids STAFF from managing staff assignment even on their own assigned request", () => {
    const result = evaluateStaffAssignmentAccess(membership("STAFF"), userId, {
      partnerId: "partner-1",
      partnerStaffId: userId,
    });
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("hides a non-assigned STAFF's request as notfound", () => {
    const result = evaluateStaffAssignmentAccess(membership("STAFF"), userId, {
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
    });
    expect(result).toEqual({ ok: false, reason: "notfound" });
  });

  it("forbids VIEWER from managing staff assignment", () => {
    const result = evaluateStaffAssignmentAccess(membership("VIEWER"), userId, {
      partnerId: "partner-1",
      partnerStaffId: null,
    });
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });
});
