import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  membershipFindFirst: vi.fn(),
  invitationUpdateMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerMembership: { findFirst: mocks.membershipFindFirst },
    partnerInvitation: { updateMany: mocks.invitationUpdateMany },
  },
}));

import { DELETE } from "@/app/api/partner/team/invitations/[invitationId]/route";

function call(invitationId = "invitation-1") {
  const request = new Request(
    `http://localhost/api/partner/team/invitations/${invitationId}`,
    { method: "DELETE" },
  );
  return DELETE(request, { params: Promise.resolve({ invitationId }) });
}

describe("DELETE /api/partner/team/invitations/[invitationId]", () => {
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
      role: "OWNER",
      partner: { active: true },
    });
    mocks.invitationUpdateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects a non-owner with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "staff-membership",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true },
    });

    const response = await call();
    expect(response.status).toBe(403);
    expect(mocks.invitationUpdateMany).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call();
    expect(response.status).toBe(403);
  });

  it("cancels a pending invitation by setting revokedAt", async () => {
    const response = await call("invitation-1");

    expect(response.status).toBe(200);
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith({
      where: {
        id: "invitation-1",
        partnerId: "partner-1",
        usedAt: null,
        revokedAt: null,
      },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it("returns 404 when the invitation doesn't exist, belongs to another company, or is already resolved", async () => {
    mocks.invitationUpdateMany.mockResolvedValue({ count: 0 });

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("초대를 찾을 수 없습니다.");
  });
});
