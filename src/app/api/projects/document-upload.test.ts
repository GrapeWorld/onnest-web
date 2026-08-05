import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  projectFindFirst: vi.fn(),
  documentCreate: vi.fn(),
  isStorageConfigured: vi.fn(),
  putProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst: mocks.projectFindFirst },
    document: { create: mocks.documentCreate },
  },
}));
vi.mock("@/lib/storage", () => ({
  isStorageConfigured: mocks.isStorageConfigured,
  putProjectFile: mocks.putProjectFile,
  deleteProjectFile: mocks.deleteProjectFile,
}));

import { POST } from "@/app/api/projects/[id]/documents/route";

function uploadRequest(file: File) {
  const form = new FormData();
  form.set("file", file);
  return new Request("http://localhost/api/projects/project-1/documents", {
    method: "POST",
    body: form,
  });
}

const context = { params: Promise.resolve({ id: "project-1" }) };

describe("document upload", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.projectFindFirst.mockResolvedValue({ id: "project-1" });
    mocks.isStorageConfigured.mockReturnValue(true);
    mocks.putProjectFile.mockResolvedValue({ storageKey: "private-key" });
    mocks.deleteProjectFile.mockResolvedValue(undefined);
  });

  it("rejects a spoofed MIME type before writing to Blob", async () => {
    const spoofed = new File(["not a pdf"], "contract.pdf", {
      type: "application/pdf",
    });

    const response = await POST(uploadRequest(spoofed), context);

    expect(response.status).toBe(400);
    expect(mocks.putProjectFile).not.toHaveBeenCalled();
  });

  it("removes the uploaded Blob when the database insert fails", async () => {
    const pdf = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "contract.pdf", {
      type: "application/pdf",
    });
    const databaseError = new Error("database unavailable");
    mocks.documentCreate.mockRejectedValue(databaseError);

    await expect(POST(uploadRequest(pdf), context)).rejects.toThrow(databaseError);
    expect(mocks.deleteProjectFile).toHaveBeenCalledWith("private-key");
  });
});
