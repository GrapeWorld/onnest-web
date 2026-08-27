import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  inquiryFindUnique: vi.fn(),
  messageCreate: vi.fn(),
  notificationCreate: vi.fn(),
  transaction: vi.fn(),
  notifyInquiryCustomer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    inquiry: { findUnique: mocks.inquiryFindUnique },
    inquiryMessage: { create: mocks.messageCreate },
    notification: { upsert: mocks.notificationCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyInquiryCustomer: mocks.notifyInquiryCustomer,
}));
vi.mock("@/lib/appUrl", () => ({
  getAppUrl: () => "https://app.example.com",
}));

import { POST } from "@/app/api/admin/inquiries/[id]/messages/route";

function call(body: unknown, id = "inquiry-1") {
  const request = new Request(`http://localhost/api/admin/inquiries/${id}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/inquiries/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      name: "관리자",
      adminRole: "super",
    });
    mocks.inquiryFindUnique.mockResolvedValue({
      id: "inquiry-1",
      name: "홍길동",
      email: "customer@example.com",
      userId: "customer-1",
    });
    mocks.messageCreate.mockResolvedValue({ id: "message-1" });
    mocks.notificationCreate.mockResolvedValue({});
    mocks.notifyInquiryCustomer.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        inquiryMessage: { create: mocks.messageCreate },
        notification: { upsert: mocks.notificationCreate },
      }),
    );
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({ body: "답변입니다" });

    expect(response.status).toBe(403);
    expect(mocks.messageCreate).not.toHaveBeenCalled();
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ body: "답변입니다" });
    expect(response.status).toBe(403);
  });

  it("rejects an empty message", async () => {
    const response = await call({ body: "" });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing inquiry", async () => {
    mocks.inquiryFindUnique.mockResolvedValue(null);

    const response = await call({ body: "답변입니다" });
    expect(response.status).toBe(404);
  });

  it("creates an ADMIN message and notifies the customer by email", async () => {
    const response = await call({ body: "문의하신 내용 확인했습니다." });

    expect(response.status).toBe(201);
    expect(mocks.messageCreate).toHaveBeenCalledWith({
      data: {
        inquiryId: "inquiry-1",
        senderRole: "ADMIN",
        body: "문의하신 내용 확인했습니다.",
        senderId: "admin-1",
        senderEmail: "admin@onnesthome.com",
        senderName: "관리자",
      },
    });
    expect(mocks.notifyInquiryCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "customer@example.com" }),
    );
  });

  it("still returns 201 when the customer notification fails", async () => {
    mocks.notifyInquiryCustomer.mockRejectedValue(new Error("resend down"));

    const response = await call({ body: "답변입니다" });

    expect(response.status).toBe(201);
  });

  it("creates an in-app notification for the linked customer", async () => {
    const response = await call({ body: "답변입니다" });

    expect(response.status).toBe(201);
    expect(mocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ recipientUserId: "customer-1", type: "INQUIRY_ANSWERED" }),
      }),
    );
  });

  it("skips the in-app notification for a guest (non-linked) inquiry", async () => {
    mocks.inquiryFindUnique.mockResolvedValue({
      id: "inquiry-1",
      name: "홍길동",
      email: "customer@example.com",
      userId: null,
    });

    const response = await call({ body: "답변입니다" });

    expect(response.status).toBe(201);
    expect(mocks.notificationCreate).not.toHaveBeenCalled();
  });
});
