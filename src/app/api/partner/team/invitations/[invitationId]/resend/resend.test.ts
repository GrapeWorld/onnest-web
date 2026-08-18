import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  membershipFindFirst: vi.fn(),
  invitationFindFirst: vi.fn(),
  invitationUpdateMany: vi.fn(),
  partnerFindUniqueOrThrow: vi.fn(),
  createInvitation: vi.fn(),
  checkRateLimit: vi.fn(),
  notifyPartnerInvitation: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerMembership: { findFirst: mocks.membershipFindFirst },
    partnerInvitation: { findFirst: mocks.invitationFindFirst, updateMany: mocks.invitationUpdateMany },
    partner: { findUniqueOrThrow: mocks.partnerFindUniqueOrThrow },
  },
}));
vi.mock("@/lib/partnerInvitation", () => ({
  createInvitation: mocks.createInvitation,
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyPartnerInvitation: mocks.notifyPartnerInvitation,
}));
vi.mock("@/lib/appUrl", () => ({
  getAppUrl: () => "https://app.example.com",
}));

import { POST } from "@/app/api/partner/team/invitations/[invitationId]/resend/route";

function call(invitationId = "invitation-1") {
  const request = new Request(
    `http://localhost/api/partner/team/invitations/${invitationId}/resend`,
    { method: "POST" },
  );
  return POST(request, { params: Promise.resolve({ invitationId }) });
}

describe("POST /api/partner/team/invitations/[invitationId]/resend", () => {
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
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.invitationFindFirst.mockResolvedValue({ email: "staff@example.com", role: "STAFF" });
    mocks.invitationUpdateMany.mockResolvedValue({ count: 1 });
    mocks.partnerFindUniqueOrThrow.mockResolvedValue({ name: "테스트업체" });
    mocks.createInvitation.mockResolvedValue("new-token");
    mocks.notifyPartnerInvitation.mockResolvedValue(undefined);
  });

  it("rejects a non-owner with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "staff-membership",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await call();
    expect(response.status).toBe(403);
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call();
    expect(response.status).toBe(429);
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("returns 404 when the invitation doesn't exist, belongs to another company, or is already resolved", async () => {
    mocks.invitationFindFirst.mockResolvedValue(null);

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("초대를 찾을 수 없습니다.");
    expect(mocks.createInvitation).not.toHaveBeenCalled();
  });

  it("revokes the old invitation and issues a new one for the same email/role", async () => {
    const response = await call("invitation-1");

    expect(response.status).toBe(201);
    expect(mocks.invitationUpdateMany).toHaveBeenCalledWith({
      where: { id: "invitation-1", usedAt: null, revokedAt: null },
      data: { revokedAt: expect.any(Date) },
    });
    expect(mocks.createInvitation).toHaveBeenCalledWith({
      partnerId: "partner-1",
      email: "staff@example.com",
      role: "STAFF",
      invitedById: "owner-1",
    });
    expect(mocks.notifyPartnerInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ to: "staff@example.com" }),
    );
  });
});
