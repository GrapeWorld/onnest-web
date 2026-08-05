import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  requestFindUnique: vi.fn(),
  documentCreate: vi.fn(),
  isStorageConfigured: vi.fn(),
  putProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    serviceRequest: { findUnique: mocks.requestFindUnique },
    document: { create: mocks.documentCreate },
  },
}));
vi.mock("@/lib/storage", () => ({
  isStorageConfigured: mocks.isStorageConfigured,
  putProjectFile: mocks.putProjectFile,
  deleteProjectFile: mocks.deleteProjectFile,
}));

import { POST } from "@/app/api/partner/service-requests/[id]/files/route";

const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

function uploadRequest(file: File | null, category: string | null) {
  const form = new FormData();
  if (file) form.set("file", file);
  if (category !== null) form.set("category", category);
  return new Request("http://localhost/api/partner/service-requests/request-1/files", {
    method: "POST",
    body: form,
  });
}

function call(file: File | null, category: string | null, id = "request-1") {
  return POST(uploadRequest(file, category), { params: Promise.resolve({ id }) });
}

describe("POST /api/partner/service-requests/[id]/files", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "staff-1",
      name: "김직원",
      memberType: "PARTNER",
      partnerId: "partner-1",
    });
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "partner-1",
      projectId: "project-1",
    });
    mocks.isStorageConfigured.mockReturnValue(true);
    mocks.putProjectFile.mockResolvedValue({ storageKey: "private-key" });
    mocks.deleteProjectFile.mockResolvedValue(undefined);
    mocks.documentCreate.mockResolvedValue({
      id: "doc-1",
      filename: "quote.pdf",
      category: "QUOTE",
      size: pdfBytes.length,
      createdAt: new Date(),
    });
  });

  it("rejects a non-partner member with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "u", memberType: "CUSTOMER", partnerId: null });

    const file = new File([pdfBytes], "quote.pdf", { type: "application/pdf" });
    const response = await call(file, "QUOTE");

    expect(response.status).toBe(403);
  });

  it("returns 404 for a request belonging to a different partner", async () => {
    mocks.requestFindUnique.mockResolvedValue({
      id: "request-1",
      partnerId: "other-partner",
      projectId: "project-1",
    });

    const file = new File([pdfBytes], "quote.pdf", { type: "application/pdf" });
    const response = await call(file, "QUOTE");

    expect(response.status).toBe(404);
    expect(mocks.putProjectFile).not.toHaveBeenCalled();
  });

  it("rejects a missing/invalid category", async () => {
    const file = new File([pdfBytes], "quote.pdf", { type: "application/pdf" });
    const response = await call(file, "NOT_A_CATEGORY");

    expect(response.status).toBe(400);
    expect(mocks.putProjectFile).not.toHaveBeenCalled();
  });

  it("rejects a spoofed MIME type before writing to storage", async () => {
    const spoofed = new File(["not a pdf"], "quote.pdf", { type: "application/pdf" });
    const response = await call(spoofed, "QUOTE");

    expect(response.status).toBe(400);
    expect(mocks.putProjectFile).not.toHaveBeenCalled();
  });

  it("stores the file under the request's underlying project and records category/uploader", async () => {
    const file = new File([pdfBytes], "quote.pdf", { type: "application/pdf" });
    const response = await call(file, "QUOTE");

    expect(response.status).toBe(201);
    expect(mocks.putProjectFile).toHaveBeenCalledWith("project-1", expect.any(File));
    expect(mocks.documentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-1",
          serviceRequestId: "request-1",
          category: "QUOTE",
          uploadedByRole: "PARTNER",
          uploadedById: "staff-1",
          uploadedByName: "김직원",
        }),
      }),
    );
  });

  it("removes the uploaded blob when the database insert fails", async () => {
    const file = new File([pdfBytes], "quote.pdf", { type: "application/pdf" });
    const dbError = new Error("db down");
    mocks.documentCreate.mockRejectedValue(dbError);

    await expect(call(file, "QUOTE")).rejects.toThrow(dbError);
    expect(mocks.deleteProjectFile).toHaveBeenCalledWith("private-key");
  });

  it("returns 503 when storage isn't configured", async () => {
    mocks.isStorageConfigured.mockReturnValue(false);
    const file = new File([pdfBytes], "quote.pdf", { type: "application/pdf" });

    const response = await call(file, "QUOTE");

    expect(response.status).toBe(503);
  });
});
