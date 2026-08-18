import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  documentFindFirst: vi.fn(),
  documentDelete: vi.fn(),
  readProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
  membershipFindFirst: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findFirst: mocks.documentFindFirst, delete: mocks.documentDelete },
    partnerMembership: { findFirst: mocks.membershipFindFirst },
  },
}));
vi.mock("@/lib/storage", () => ({
  readProjectFile: mocks.readProjectFile,
  deleteProjectFile: mocks.deleteProjectFile,
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));

import { GET, DELETE } from "@/app/api/partner/service-requests/[id]/files/[fileId]/route";

function context(id = "request-1", fileId = "file-1") {
  return { params: Promise.resolve({ id, fileId }) };
}

function getRequest() {
  return new Request("http://localhost/api/partner/service-requests/request-1/files/file-1");
}

function deleteRequest() {
  return new Request("http://localhost/api/partner/service-requests/request-1/files/file-1", {
    method: "DELETE",
  });
}

describe("GET /api/partner/service-requests/[id]/files/[fileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-1",
      memberType: "PARTNER",
      partnerId: "partner-1",
      adminRole: null,
      status: "ACTIVE",
    });
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      filename: "quote.pdf",
      mimeType: "application/pdf",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "partner-1",
      serviceRequest: { partnerId: "partner-1", partnerStaffId: null },
    });
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "OWNER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.readProjectFile.mockResolvedValue(new ReadableStream());
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(401);
  });

  it("allows the assigned partner's staff to download", async () => {
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(200);
  });

  it("allows a super admin to download", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      memberType: "CUSTOMER",
      partnerId: null,
      adminRole: "super",
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(200);
  });

  it("allows a VIEWER to download (read access stays open to all roles)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "VIEWER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(200);
  });

  it("hides an unassigned STAFF's access as 404 (not their request)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      filename: "quote.pdf",
      mimeType: "application/pdf",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "partner-1",
      serviceRequest: { partnerId: "partner-1", partnerStaffId: "someone-else" },
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });

  it("blocks staff from a different partner company", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-2",
      memberType: "PARTNER",
      partnerId: "other-partner",
      adminRole: null,
      status: "ACTIVE",
    });
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-2",
      partnerId: "other-partner",
      role: "OWNER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });

  it("blocks a regular customer", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "customer-1",
      memberType: "CUSTOMER",
      partnerId: null,
      adminRole: null,
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });

  it("returns 404 when the file doesn't exist under this request", async () => {
    mocks.documentFindFirst.mockResolvedValue(null);
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });

  it("blocks the newly-assigned partner from downloading a file uploaded by the previous partner (reassignment leak)", async () => {
    // 요청은 지금 partner-1에게 배정돼 있지만, 이 파일은 이전 담당
    // 업체(old-partner)가 업로드 당시 스냅샷이다.
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      filename: "quote.pdf",
      mimeType: "application/pdf",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "old-partner",
      serviceRequest: { partnerId: "partner-1", partnerStaffId: null },
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });

  it("blocks the PREVIOUS partner's OWNER from downloading their own old file after reassignment", async () => {
    // 파일은 partner-1이 올렸고 caller도 partner-1의 OWNER지만, 이 요청은
    // 지금 new-partner로 재배정된 상태다 — document.partnerId만 비교하면
    // (재배정 전) 담당 업체 자신의 파일이라 통과해버렸다. 스냅샷이 지금
    // 살아있는 배정과 다르면 예전 담당도 더 이상 접근할 수 없어야 한다.
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      filename: "quote.pdf",
      mimeType: "application/pdf",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "partner-1",
      serviceRequest: { partnerId: "new-partner", partnerStaffId: null },
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/partner/service-requests/[id]/files/[fileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-1",
      memberType: "PARTNER",
      partnerId: "partner-1",
      adminRole: null,
      status: "ACTIVE",
    });
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "partner-1",
      serviceRequest: { partnerId: "partner-1", partnerStaffId: null },
    });
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "OWNER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.deleteProjectFile.mockResolvedValue(undefined);
    mocks.documentDelete.mockResolvedValue({});
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(403);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mocks.checkRateLimit.mockResolvedValue({ ok: false, retryAfterSeconds: 60 });

    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(429);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("deletes a partner-uploaded file scoped to its own company", async () => {
    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(200);
    expect(mocks.deleteProjectFile).toHaveBeenCalledWith("key-1");
    expect(mocks.documentDelete).toHaveBeenCalledWith({ where: { id: "file-1" } });
  });

  it("rejects a VIEWER with 403", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "VIEWER",
      partner: { active: true, verificationStatus: "APPROVED" },
    });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(403);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("hides an unassigned STAFF's access as 404 (not their request)", async () => {
    mocks.membershipFindFirst.mockResolvedValue({
      id: "membership-1",
      partnerId: "partner-1",
      role: "STAFF",
      partner: { active: true, verificationStatus: "APPROVED" },
    });
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "partner-1",
      serviceRequest: { partnerId: "partner-1", partnerStaffId: "someone-else" },
    });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("blocks deleting a file that belongs to a different company", async () => {
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "other-partner",
      serviceRequest: { partnerId: "other-partner", partnerStaffId: null },
    });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("blocks the newly-assigned partner from deleting a file uploaded by the previous partner (reassignment leak)", async () => {
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "old-partner",
      serviceRequest: { partnerId: "partner-1", partnerStaffId: null },
    });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("blocks the PREVIOUS partner's OWNER from deleting their own old file after reassignment", async () => {
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      partnerId: "partner-1",
      serviceRequest: { partnerId: "new-partner", partnerStaffId: null },
    });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });
});
