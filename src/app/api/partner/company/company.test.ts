import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  membershipFindFirst: vi.fn(),
  partnerUpdate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerMembership: { findFirst: mocks.membershipFindFirst },
    partner: { update: mocks.partnerUpdate },
  },
}));

import { PATCH } from "@/app/api/partner/company/route";

function call(body: unknown) {
  const request = new Request("http://localhost/api/partner/company", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request);
}

describe("PATCH /api/partner/company", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "owner-1",
      memberType: "PARTNER",
      partnerId: "partner-1",
      adminRole: null,
      status: "ACTIVE",
    });
    mocks.membershipFindFirst.mockResolvedValue({
      id: "owner-membership",
      partnerId: "partner-1",
      userId: "owner-1",
      role: "OWNER",
      status: "ACTIVE",
      partner: { active: true },
    });
    mocks.partnerUpdate.mockResolvedValue({
      id: "partner-1",
      name: "새 업체명",
      contactName: null,
      contactPhone: null,
      companyDescription: null,
    });
  });

  it("rejects a non-owner with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "staff-membership",
      partnerId: "partner-1",
      userId: "owner-1",
      role: "STAFF",
      status: "ACTIVE",
      partner: { active: true },
    });

    const response = await call({ name: "새 업체명" });
    expect(response.status).toBe(403);
    expect(mocks.partnerUpdate).not.toHaveBeenCalled();
  });

  it("rejects an empty name", async () => {
    const response = await call({ name: "" });
    expect(response.status).toBe(400);
  });

  it("updates the company info, converting empty optional fields to null", async () => {
    const response = await call({
      name: "새 업체명",
      contactName: "",
      contactPhone: "010-1234-5678",
      companyDescription: "",
    });

    expect(response.status).toBe(200);
    expect(mocks.partnerUpdate).toHaveBeenCalledWith({
      where: { id: "partner-1" },
      data: {
        name: "새 업체명",
        contactName: null,
        contactPhone: "010-1234-5678",
        companyDescription: null,
      },
      select: {
        id: true,
        name: true,
        contactName: true,
        contactPhone: true,
        companyDescription: true,
      },
    });
  });
});
