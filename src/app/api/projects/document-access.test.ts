import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  documentFindFirst: vi.fn(),
  documentDelete: vi.fn(),
  readProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { findFirst: mocks.documentFindFirst, delete: mocks.documentDelete },
  },
}));
vi.mock("@/lib/storage", () => ({
  readProjectFile: mocks.readProjectFile,
  deleteProjectFile: mocks.deleteProjectFile,
}));

import { GET, DELETE } from "@/app/api/projects/[id]/documents/[docId]/route";

function context(id = "project-1", docId = "doc-1") {
  return { params: Promise.resolve({ id, docId }) };
}

function getRequest() {
  return new Request("http://localhost/api/projects/project-1/documents/doc-1");
}

function deleteRequest() {
  return new Request("http://localhost/api/projects/project-1/documents/doc-1", {
    method: "DELETE",
  });
}

describe("GET/DELETE /api/projects/[id]/documents/[docId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.readProjectFile.mockResolvedValue(new ReadableStream());
    mocks.deleteProjectFile.mockResolvedValue(undefined);
    mocks.documentDelete.mockResolvedValue({});
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET(getRequest(), context());
    expect(response.status).toBe(401);
  });

  it("allows downloading the project owner's own uploaded document", async () => {
    mocks.documentFindFirst.mockResolvedValue({
      id: "doc-1",
      filename: "handover.pdf",
      mimeType: "application/pdf",
      storageKey: "key-1",
      uploadedByRole: "CUSTOMER",
    });

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(200);
    expect(mocks.documentFindFirst).toHaveBeenCalledWith({
      where: {
        id: "doc-1",
        projectId: "project-1",
        project: { userId: "user-1" },
        uploadedByRole: "CUSTOMER",
      },
    });
  });

  it("hides a partner-uploaded internal file from the project owner (404, not their file to see)", async () => {
    // findFirst's own where-clause filters uploadedByRole:"CUSTOMER", so a
    // partner-uploaded document never matches — simulate that by resolving null.
    mocks.documentFindFirst.mockResolvedValue(null);

    const response = await GET(getRequest(), context());
    expect(response.status).toBe(404);
  });

  it("blocks deleting a partner-uploaded internal file the same way", async () => {
    mocks.documentFindFirst.mockResolvedValue(null);

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(404);
    expect(mocks.documentDelete).not.toHaveBeenCalled();
  });

  it("deletes the project owner's own document", async () => {
    mocks.documentFindFirst.mockResolvedValue({
      id: "doc-1",
      storageKey: "key-1",
      uploadedByRole: "CUSTOMER",
    });

    const response = await DELETE(deleteRequest(), context());
    expect(response.status).toBe(200);
    expect(mocks.deleteProjectFile).toHaveBeenCalledWith("key-1");
    expect(mocks.documentDelete).toHaveBeenCalledWith({ where: { id: "doc-1" } });
  });
});
