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

import { POST } from "@/app/api/partner/service-requests/[id]/notes/route";

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/partner/service-requests/${id}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/partner/service-requests/[id]/notes", () => {
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
      partner: { active: true },
    });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await call({ body: "메모" });

    expect(response.status).toBe(403);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty note", async () => {
    const response = await call({ body: "" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a request belonging to a different partner", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "other-partner",
      partnerStaffId: null,
    });

    const response = await call({ body: "메모" });
    expect(response.status).toBe(404);
  });

  it("rejects a VIEWER with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "VIEWER",
      partner: { active: true },
    });

    const response = await call({ body: "메모" });
    expect(response.status).toBe(403);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("hides an unassigned STAFF's access as 404 (not their request)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true },
    });
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: "someone-else",
    });

    const response = await call({ body: "메모" });
    expect(response.status).toBe(404);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("allows an assigned STAFF to write a note", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true },
    });
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      partnerStaffId: "staff-1",
    });

    const response = await call({ body: "메모" });
    expect(response.status).toBe(201);
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await call({ body: "메모" });

    expect(response.status).toBe(429);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("creates a NOTE_ADDED activity with actorRole PARTNER", async () => {
    const response = await call({ body: "고객이 오후 방문 요청" });

    expect(response.status).toBe(201);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: {
        serviceRequestId: "request-1",
        action: "NOTE_ADDED",
        note: "고객이 오후 방문 요청",
        actorId: "staff-1",
        actorEmail: "staff@partner.example.com",
        actorName: "김직원",
        actorRole: "PARTNER",
        partnerId: "partner-1",
      },
    });
  });
});
