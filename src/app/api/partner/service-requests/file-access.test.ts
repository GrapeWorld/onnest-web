import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  documentFindFirst: vi.fn(),
  documentDelete: vi.fn(),
  readProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findFirst: mocks.documentFindFirst, delete: mocks.documentDelete },
  },
}));
vi.mock("@/lib/storage", () => ({
  readProjectFile: mocks.readProjectFile,
  deleteProjectFile: mocks.deleteProjectFile,
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
    });
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      filename: "quote.pdf",
      mimeType: "application/pdf",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      serviceRequest: { partnerId: "partner-1" },
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

  it("blocks staff from a different partner company", async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-2",
      memberType: "PARTNER",
      partnerId: "other-partner",
      adminRole: null,
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
});

describe("DELETE /api/partner/service-requests/[id]/files/[fileId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-1",
      memberType: "PARTNER",
      partnerId: "partner-1",
      adminRole: null,
    });
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      serviceRequest: { partnerId: "partner-1" },
    });
    mocks.deleteProjectFile.mockResolvedValue(undefined);
    mocks.documentDelete.mockResolvedValue({});
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(403);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("deletes a partner-uploaded file scoped to its own company", async () => {
    const response = await DELETE(deleteRequest(), context());

    expect(response.status).toBe(200);
    expect(mocks.deleteProjectFile).toHaveBeenCalledWith("key-1");
    expect(mocks.documentDelete).toHaveBeenCalledWith({ where: { id: "file-1" } });
  });

  it("blocks deleting a file that belongs to a different company", async () => {
    mocks.documentFindFirst.mockResolvedValue({
      id: "file-1",
      storageKey: "key-1",
      uploadedByRole: "PARTNER",
      serviceRequest: { partnerId: "other-partner" },
    });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });
});
