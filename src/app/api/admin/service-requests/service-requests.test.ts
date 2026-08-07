import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUniqueRequest: vi.fn(),
  findUniquePartner: vi.fn(),
  update: vi.fn(),
  userFindMany: vi.fn(),
  notifyPartnerStaff: vi.fn(),
  quoteDeleteMany: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
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
    serviceRequestActivity: { create: mocks.activityCreate },
    $transaction: mocks.transaction,
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
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnest.example.com",
      name: "관리자",
      adminRole: "super",
    });
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "신규",
      partnerId: null,
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.update.mockResolvedValue({ id: "request-1", partnerId: "partner-1" });
    mocks.userFindMany.mockResolvedValue([{ email: "staff@partner.example.com" }]);
    mocks.notifyPartnerStaff.mockResolvedValue(undefined);
    mocks.quoteDeleteMany.mockResolvedValue({ count: 0 });
    mocks.activityCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { findUnique: mocks.findUniqueRequest, update: mocks.update },
        partner: { findUnique: mocks.findUniquePartner },
        serviceRequestQuote: { deleteMany: mocks.quoteDeleteMany },
        serviceRequestActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("returns 409 on a concurrent-conflict transaction failure", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ partnerId: "partner-1" });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe("다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.");
  });

  it("runs the update and quote cleanup inside a single Serializable transaction", async () => {
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    // update()와 deleteMany()가 같은 트랜잭션 콜백 안에서, 트랜잭션이 성공한
    // 뒤에야 호출됐는지 확인한다 — 분리된 별개 호출이면 이 순서 보장이 없다.
    expect(mocks.update).toHaveBeenCalled();
    expect(mocks.quoteDeleteMany).toHaveBeenCalled();
  });

  it("rejects assigning a partner to a request the customer hasn't consented to share PII on", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "신규",
      partnerId: null,
      privacyAgreedAt: null,
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    const response = await call({ partnerId: "partner-1" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "고객이 개인정보 제공에 동의하지 않은 신청은 업체에 배정할 수 없습니다.",
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows a status-only update on a non-consented request (no partnerId in the body)", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "신규",
      partnerId: null,
      privacyAgreedAt: null,
    });

    const response = await call({ status: "확인 중" });
    expect(response.status).toBe(200);
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
      data: {
        partnerId: "partner-1",
        status: "신규",
        selectedQuoteId: null,
        selectedAt: null,
        partnerStaffId: null,
      },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
  });

  it("does not revert an already-작업 완료 request when a new partner is assigned", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "작업 완료",
      partnerId: null,
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: {
        partnerId: "partner-1",
        selectedQuoteId: null,
        selectedAt: null,
        partnerStaffId: null,
      },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
  });

  it("resets a 취소 request to 신규 when reassigned to a different partner", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "취소",
      partnerId: "old-partner",
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });

    await call({ partnerId: "partner-1" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: {
        partnerId: "partner-1",
        status: "신규",
        selectedQuoteId: null,
        selectedAt: null,
        partnerStaffId: null,
      },
      select: { id: true, status: true, owner: true, partnerId: true },
    });
  });

  it("does not force a status change when re-saving the same partner", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "확인 중",
      partnerId: "partner-1",
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
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
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await call({ partnerId: null });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "request-1" },
      data: {
        partnerId: null,
        selectedQuoteId: null,
        selectedAt: null,
        partnerStaffId: null,
      },
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
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
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
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
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

  it("logs a STATUS_CHANGED activity when the status actually changes", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "확인 중",
      partnerId: "partner-1",
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.update.mockResolvedValue({
      id: "request-1",
      status: "작업 예정",
      owner: null,
      partnerId: "partner-1",
    });

    await call({ status: "작업 예정" });

    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        serviceRequestId: "request-1",
        action: "STATUS_CHANGED",
        changes: { from: "확인 중", to: "작업 예정" },
        actorId: "admin-1",
        actorEmail: "admin@onnest.example.com",
        actorName: "관리자",
        actorRole: "ADMIN",
        partnerId: "partner-1",
      }),
    });
  });

  it("does not log an activity when the status doesn't change", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "확인 중",
      partnerId: "partner-1",
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.update.mockResolvedValue({
      id: "request-1",
      status: "확인 중",
      owner: null,
      partnerId: "partner-1",
    });

    await call({ status: "확인 중" });

    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("logs a STATUS_CHANGED activity for the implicit 신규 reset on reassignment", async () => {
    mocks.findUniqueRequest.mockResolvedValue({
      id: "request-1",
      serviceType: "이사",
      status: "취소",
      partnerId: "old-partner",
      privacyAgreedAt: new Date("2026-01-01T00:00:00.000Z"),
    });
    mocks.findUniquePartner.mockResolvedValue({ active: true, serviceType: "이사" });
    mocks.update.mockResolvedValue({
      id: "request-1",
      status: "신규",
      owner: null,
      partnerId: "partner-1",
    });

    await call({ partnerId: "partner-1" });

    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "STATUS_CHANGED",
        changes: { from: "취소", to: "신규" },
        actorRole: "ADMIN",
        partnerId: "partner-1",
      }),
    });
  });
});
