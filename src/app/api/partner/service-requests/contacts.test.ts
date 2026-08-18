import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requestFindUnique: vi.fn(),
  activityCreate: vi.fn(),
  membershipFindFirst: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.requestFindUnique },
    serviceRequestActivity: { create: mocks.activityCreate },
    partnerMembership: { findFirst: mocks.membershipFindFirst },
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));

import { POST } from "@/app/api/partner/service-requests/[id]/contacts/route";

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    method: "전화",
    result: "통화 연결, 견적 안내",
    contactedAt: "2026-08-05T10:00:00.000Z",
    followUp: "내일 오전 재연락",
    ...overrides,
  };
}

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/partner/service-requests/${id}/contacts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/partner/service-requests/[id]/contacts", () => {
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
    mocks.activityCreate.mockResolvedValue({ id: "activity-1" });
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "OWNER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await call(baseInput());

    expect(response.status).toBe(403);
  });

  it("rejects an invalid contact method", async () => {
    const response = await call(baseInput({ method: "비둘기" }));
    expect(response.status).toBe(400);
  });

  it("returns 404 for a request belonging to a different partner", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "other-partner",
      partnerStaffId: null,
    });

    const response = await call(baseInput());
    expect(response.status).toBe(404);
  });

  it("rejects a VIEWER with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "VIEWER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await call(baseInput());
    expect(response.status).toBe(403);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
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

    const response = await call(baseInput());
    expect(response.status).toBe(404);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call(baseInput());

    expect(response.status).toBe(429);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("creates a CONTACT_LOGGED activity with actorRole PARTNER", async () => {
    const response = await call(baseInput());

    expect(response.status).toBe(201);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: {
        serviceRequestId: "request-1",
        action: "CONTACT_LOGGED",
        changes: {
          method: "전화",
          result: "통화 연결, 견적 안내",
          contactedAt: "2026-08-05T10:00:00.000Z",
          followUp: "내일 오전 재연락",
        },
        actorId: "staff-1",
        actorEmail: "staff@partner.example.com",
        actorName: "김직원",
        actorRole: "PARTNER",
        partnerId: "partner-1",
      },
    });
  });
});
