import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  membershipFindFirst: vi.fn(),
  partnerFindUniqueOrThrow: vi.fn(),
  invitationCreate: vi.fn(),
  checkRateLimit: vi.fn(),
  notifyPartnerInvitation: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partnerMembership: { findFirst: mocks.membershipFindFirst },
    partner: { findUniqueOrThrow: mocks.partnerFindUniqueOrThrow },
    partnerInvitation: { create: mocks.invitationCreate },
  },
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

import { POST } from "@/app/api/partner/team/invitations/route";

function call(body: unknown) {
  const request = new Request("http://localhost/api/partner/team/invitations", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/partner/team/invitations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "owner-1",
      email: "owner@partner.example.com",
      name: "대표",
      memberType: "PARTNER",
      partnerId: "partner-1",
      adminRole: null,
      status: "ACTIVE",
    });
    // requirePartnerOwner()는 partnerAuth.ts에서 prisma.partnerMembership.findFirst를 호출한다.
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      userId: "owner-1",
      role: "OWNER",
      status: "ACTIVE",
      partner: { active: true },
    });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.partnerFindUniqueOrThrow.mockResolvedValue({ name: "테스트업체" });
    mocks.invitationCreate.mockResolvedValue({});
    mocks.notifyPartnerInvitation.mockResolvedValue(undefined);
  });

  it("rejects a non-owner (e.g. staff) with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-2",
      partnerId: "partner-1",
      userId: "owner-1",
      role: "STAFF",
      status: "ACTIVE",
      partner: { active: true },
    });

    const response = await call({ email: "new@example.com", role: "STAFF" });
    expect(response.status).toBe(403);
    expect(mocks.invitationCreate).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated request with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call({ email: "new@example.com", role: "STAFF" });
    expect(response.status).toBe(403);
  });

  it("rejects an invalid email", async () => {
    const response = await call({ email: "not-an-email", role: "STAFF" });
    expect(response.status).toBe(400);
  });

  it("rejects OWNER as an invitable role", async () => {
    const response = await call({ email: "new@example.com", role: "OWNER" });
    expect(response.status).toBe(400);
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call({ email: "new@example.com", role: "STAFF" });
    expect(response.status).toBe(429);
    expect(mocks.invitationCreate).not.toHaveBeenCalled();
  });

  it("rejects inviting an email already ACTIVE at this company", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce({
        id: "membership-1",
        partnerId: "partner-1",
        userId: "owner-1",
        role: "OWNER",
        status: "ACTIVE",
        partner: { active: true },
      })
      .mockResolvedValueOnce({ id: "existing-membership" });

    const response = await call({ email: "already@example.com", role: "STAFF" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("이미 우리 업체에 소속된 이메일입니다.");
    expect(mocks.invitationCreate).not.toHaveBeenCalled();
  });

  it("creates an invitation and sends the email", async () => {
    mocks.membershipFindFirst
      .mockResolvedValueOnce({
        id: "membership-1",
        partnerId: "partner-1",
        userId: "owner-1",
        role: "OWNER",
        status: "ACTIVE",
        partner: { active: true },
      })
      .mockResolvedValueOnce(null);

    const response = await call({ email: "new@example.com", role: "STAFF" });

    expect(response.status).toBe(201);
    expect(mocks.invitationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          partnerId: "partner-1",
          email: "new@example.com",
          role: "STAFF",
          invitedById: "owner-1",
        }),
      }),
    );
    expect(mocks.notifyPartnerInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ to: "new@example.com" }),
    );
  });
});
