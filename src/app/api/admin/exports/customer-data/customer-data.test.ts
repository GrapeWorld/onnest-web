import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  buildAdminExportWorkbook: vi.fn(),
  exportHistoryCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: (s: number) => `${s}초`,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { adminDataExportHistory: { create: mocks.exportHistoryCreate } },
}));
vi.mock("@/lib/adminExport", () => ({
  buildAdminExportWorkbook: mocks.buildAdminExportWorkbook,
}));

import { POST } from "@/app/api/admin/exports/customer-data/route";

function request(body: unknown) {
  return new Request("http://localhost/api/admin/exports/customer-data", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validBody = {
  exportType: "CUSTOMER",
  customerId: "customer-1",
  sections: ["CUSTOMER_SUMMARY", "PROJECT"],
  reason: "고객 민원 대응",
};

describe("POST /api/admin/exports/customer-data", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      name: "관리자",
      email: "admin@onnesthome.com",
      adminRole: "super",
    });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.buildAdminExportWorkbook.mockResolvedValue({
      ok: true,
      buffer: Buffer.from("fake-xlsx"),
      rowCount: 5,
      includedSections: ["CUSTOMER_SUMMARY", "PROJECT"],
    });
    mocks.exportHistoryCreate.mockResolvedValue({});
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", adminRole: null });
    const response = await POST(request(validBody));
    expect(response.status).toBe(403);
    expect(mocks.buildAdminExportWorkbook).not.toHaveBeenCalled();
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "v", adminRole: "viewer" });
    const response = await POST(request(validBody));
    expect(response.status).toBe(403);
    expect(mocks.buildAdminExportWorkbook).not.toHaveBeenCalled();
  });

  it("is rate limited per admin", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });
    const response = await POST(request(validBody));
    expect(response.status).toBe(429);
    expect(mocks.checkRateLimit).toHaveBeenCalledWith("adminExport", "admin-1");
    expect(mocks.buildAdminExportWorkbook).not.toHaveBeenCalled();
  });

  it("rejects a missing reason", async () => {
    const response = await POST(request({ ...validBody, reason: "" }));
    expect(response.status).toBe(400);
    expect(mocks.buildAdminExportWorkbook).not.toHaveBeenCalled();
  });

  it("rejects an empty section selection", async () => {
    const response = await POST(request({ ...validBody, sections: [] }));
    expect(response.status).toBe(400);
  });

  it("rejects CUSTOMER export without a customerId", async () => {
    const response = await POST(request({ ...validBody, customerId: undefined }));
    expect(response.status).toBe(400);
  });

  it("returns 404 for a nonexistent customer and records a failed history entry", async () => {
    mocks.buildAdminExportWorkbook.mockResolvedValue({ ok: false, errorCode: "NOTFOUND_CUSTOMER" });
    const response = await POST(request(validBody));
    const data = await response.json();
    expect(response.status).toBe(404);
    expect(data.error).toBe("고객을 찾을 수 없습니다.");
    expect(mocks.exportHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED", failureReasonCode: "NOTFOUND_CUSTOMER" }) }),
    );
  });

  it("streams the generated xlsx with correct headers on success", async () => {
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(response.headers.get("Content-Disposition")).toMatch(/^attachment; filename="onnest-customer-data-\d{4}-\d{2}-\d{2}\.xlsx"$/);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("does not leak the customer's email or phone into the filename", async () => {
    const response = await POST(request(validBody));
    const disposition = response.headers.get("Content-Disposition") ?? "";
    expect(disposition).not.toContain("@");
  });

  it("records a success audit history entry with row count but no file content", async () => {
    await POST(request(validBody));
    expect(mocks.exportHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId: "admin-1",
          exportType: "CUSTOMER",
          customerId: "customer-1",
          status: "SUCCESS",
          rowCount: 5,
        }),
      }),
    );
    const call = mocks.exportHistoryCreate.mock.calls[0][0];
    expect(call.data).not.toHaveProperty("buffer");
    expect(JSON.stringify(call.data)).not.toContain("fake-xlsx");
  });

  it("records a failed history entry and returns 500 without leaking internals when generation throws", async () => {
    mocks.buildAdminExportWorkbook.mockRejectedValue(new Error("internal db timeout with secret details"));
    const response = await POST(request(validBody));
    const data = await response.json();
    expect(response.status).toBe(500);
    expect(data.error).not.toContain("secret");
    expect(mocks.exportHistoryCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
  });

  it("keeps the export working even when audit history logging itself fails", async () => {
    mocks.exportHistoryCreate.mockRejectedValue(new Error("history db down"));
    const response = await POST(request(validBody));
    expect(response.status).toBe(200);
  });
});
