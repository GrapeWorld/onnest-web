import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requestFindUnique: vi.fn(),
  activityCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.requestFindUnique },
    serviceRequestActivity: { create: mocks.activityCreate },
  },
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
    });
    mocks.requestFindUnique.mockResolvedValue({ id: "request-1", partnerId: "partner-1" });
    mocks.activityCreate.mockResolvedValue({ id: "activity-1" });
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
    mocks.requestFindUnique.mockResolvedValue({ id: "request-1", partnerId: "other-partner" });

    const response = await call({ body: "메모" });
    expect(response.status).toBe(404);
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
      },
    });
  });
});
