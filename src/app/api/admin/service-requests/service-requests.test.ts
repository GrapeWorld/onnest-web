import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUniqueRequest: vi.fn(),
  findUniquePartner: vi.fn(),
  update: vi.fn(),
  userFindMany: vi.fn(),
  notifyPartnerStaff: vi.fn(),
  quoteDeleteMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.findUniqueRequest, update: mocks.update },
    partner: { findUnique: mocks.findUniquePartner },
    user: { findMany: mocks.userFindMany },
    serviceRequestQuote: { deleteMany: mocks.quoteDeleteMany },
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyPartnerStaff: mocks.notifyPartnerStaff,
}));

import { PATCH } from "@/app/api/admin/service-requests/[id]/route";

function call(body: unknown, id = "request-1") {
  const request = new Request(`http://localhost/api/admin/service-requests/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/admin/service-requests/[id] partner assignment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "신규",
      partnerId: null,
    });
    mocks.update.mockResolvedValue({ id: "request-1", partnerId: "partner-1" });
    mocks.userFindMany.mockResolvedValue([{ email: "staff@partner.example.com" }]);
    mocks.notifyPartnerStaff.mockResolvedValue(undefined);
    mocks.quoteDeleteMany.mockResolvedValue({ count: 0 });
  });

  it("rejects assigning a partner that doesn't exist", async () => {
    mocks.findUniquePartner.mockResolvedValue(null);

    const response = await call({ partnerId: "missing" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("배정할 수 없는 업체입니다.");
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects assigning an inactive partner", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: false, serviceType: "이사" });

    const response = await call({ partnerId: "partner-1" });

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects assigning a partner whose serviceType doesn't match the request", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "입주청소" });

    const response = await call({ partnerId: "partner-1" });

    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows assigning a matching active partner", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    const response = await call({ partnerId: "partner-1" });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("allows unassigning (partnerId: null) without a partner lookup or notification", async () => {
    const response = await call({ partnerId: null });

    expect(response.status).toBe(200);
    expect(mocks.findUniquePartner).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledTimes(1);
    expect(mocks.notifyPartnerStaff).not.toHaveBeenCalled();
  });

  it("auto-switches status to 신규 (that partner's queue start) when a new partner is assigned", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { partnerId: "partner-1", status: "신규", selectedQuoteId: null, selectedAt: null },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
  });

  it("does not revert an already-작업 완료 request when a new partner is assigned", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "작업 완료",
      partnerId: null,
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { partnerId: "partner-1", selectedQuoteId: null, selectedAt: null },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
  });

  it("resets a 취소 request to 신규 when reassigned to a different partner", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "취소",
      partnerId: "old-partner",
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { partnerId: "partner-1", status: "신규", selectedQuoteId: null, selectedAt: null },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
  });

  it("does not force a status change when re-saving the same partner", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "확인 중",
      partnerId: "partner-1",
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1", status: "확인 중" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { partnerId: "partner-1", status: "확인 중" },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
    expect(mocks.notifyPartnerStaff).not.toHaveBeenCalled();
  });

  it("does not touch status when unassigning a partner", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "확인 중",
      partnerId: "partner-1",
    });

    await call({ partnerId: null });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: { partnerId: null, selectedQuoteId: null, selectedAt: null },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
  });

  it("clears existing quotes and the selection when reassigned to a different partner", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.quoteDeleteMany).toHaveBeenCalledWith({
      where: { serviceRequestId: "request-1" },
    });
  });

  it("clears quotes when unassigning (partnerId: null)", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "확인 중",
      partnerId: "partner-1",
    });

    await call({ partnerId: null });

    expect(mocks.quoteDeleteMany).toHaveBeenCalledWith({
      where: { serviceRequestId: "request-1" },
    });
  });

  it("does not clear quotes when re-saving the same partner", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "확인 중",
      partnerId: "partner-1",
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1", status: "확인 중" });

    expect(mocks.quoteDeleteMany).not.toHaveBeenCalled();
  });

  it("does not clear quotes for a status-only update with no partnerId field", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "신규",
      partnerId: "partner-1",
    });

    await call({ status: "확인 중" });

    expect(mocks.quoteDeleteMany).not.toHaveBeenCalled();
  });

  it("notifies the newly-assigned partner's active staff", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.userFindMany).toHaveBeenCalledWith({
      where: { partnerId: "partner-1", memberType: "PARTNER", status: "ACTIVE" },
      select: { email: true },
    });
    expect(mocks.notifyPartnerStaff).toHaveBeenCalledWith(
      expect.objectContaining({ to: ["staff@partner.example.com"] }),
    );
  });

  it("still returns 200 when the notification fails", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });
    mocks.notifyPartnerStaff.mockRejectedValue(new Error("resend down"));

    const response = await call({ partnerId: "partner-1" });

    expect(response.status).toBe(200);
  });
});
