import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUniqueRequest: vi.fn(),
  update: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
  notifyServiceRequestCustomer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.findUniqueRequest, update: mocks.update },
    serviceRequestActivity: { create: mocks.activityCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyServiceRequestCustomer: mocks.notifyServiceRequestCustomer,
}));

import { POST } from "@/app/api/admin/service-requests/[id]/no-partner-notice/route";

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/admin/service-requests/${id}/no-partner-notice`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/service-requests/[id]/no-partner-notice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnest.example.com",
      name: "관리자",
      adminRole: "super",
    });
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      status: "신규",
      serviceType: "이사",
      projectId: "project-1",
      project: { user: { email: "customer@example.com", name: "고객" } },
    });
    mocks.update.mockResolvedValue({});
    mocks.activityCreate.mockResolvedValue({});
    mocks.notifyServiceRequestCustomer.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findUnique: mocks.findUniqueRequest, update: mocks.update },
        serviceRequestActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("rejects non-super-admins", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-2", adminRole: "viewer" });

    const response = await call({ reason: "해당 지역 취급 업체 없음" });

    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("requires a non-empty reason", async () => {
    const response = await call({ reason: "  " });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing request", async () => {
    mocks.findUniqueRequest.mockResolvedValue(null);

    const response = await call({ reason: "사유" });

    expect(response.status).toBe(404);
  });

  it.each(["작업 완료", "취소"])("blocks sending a notice for a terminal request (%s)", async (status) => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      status,
      serviceType: "이사",
      projectId: "project-1",
      project: { user: { email: "customer@example.com", name: "고객" } },
    });

    const response = await call({ reason: "사유" });

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("saves the internal reason, timestamps the notice, and logs an admin-authored activity", async () => {
    await call({ reason: "해당 지역 취급 업체 없음" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { noPartnerReason: "해당 지역 취급 업체 없음", noPartnerNoticeSentAt: expect.any(Date) },
    });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceRequestId: "request-1",
        action: "NO_PARTNER_NOTICE",
        note: "해당 지역 취급 업체 없음",
        actorId: "admin-1",
        actorRole: "ADMIN",
      }),
    });
  });

  it("emails the customer a generic notice, never the raw internal reason", async () => {
    await call({ reason: "업체가 응답이 없어 곤란함" });

    expect(mocks.notifyServiceRequestCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "customer@example.com" }),
    );
    const [[emailCall]] = mocks.notifyServiceRequestCustomer.mock.calls;
    expect(emailCall.html).not.toContain("업체가 응답이 없어 곤란함");
  });

  it("saves core state even if the notification email fails", async () => {
    mocks.notifyServiceRequestCustomer.mockRejectedValue(new Error("resend down"));

    const response = await call({ reason: "사유" });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalled();
  });

  it("returns 409 on a concurrent-conflict transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ reason: "사유" });

    expect(response.status).toBe(409);
  });
});
