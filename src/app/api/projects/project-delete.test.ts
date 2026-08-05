import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  deleteMany: vi.fn(),
  deleteProjectFiles: vi.fn(),
  isStorageConfigured: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: { project: { findFirst: mocks.findFirst, deleteMany: mocks.deleteMany } },
}));
vi.mock("@/lib/storage", () => ({
  deleteProjectFiles: mocks.deleteProjectFiles,
  isStorageConfigured: mocks.isStorageConfigured,
}));

import { DELETE } from "@/app/api/projects/[id]/route";

const context = { params: Promise.resolve({ id: "project-1" }) };

describe("project deletion", () => {
  beforeEach(() => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.isStorageConfigured.mockReturnValue(true);
    mocks.deleteProjectFiles.mockResolvedValue({ failedCount: 0, total: 2 });
    mocks.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("deletes private blobs before deleting the project row", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "project-1",
      documents: [{ storageKey: "one" }, { storageKey: "two" }],
    });

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(200);
    expect(mocks.deleteProjectFiles).toHaveBeenCalledWith(["one", "two"]);
    expect(mocks.deleteMany).toHaveBeenCalledWith({
      where: { id: "project-1", userId: "user-1" },
    });
  });

  it("keeps database records when blob cleanup fails", async () => {
    mocks.findFirst.mockResolvedValue({
      id: "project-1",
      documents: [{ storageKey: "one" }],
    });
    mocks.deleteProjectFiles.mockResolvedValue({ failedCount: 1, total: 1 });

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(502);
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });

  it("does not touch storage for a project the user does not own", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await DELETE(new Request("http://localhost"), context);

    expect(response.status).toBe(404);
    expect(mocks.deleteProjectFiles).not.toHaveBeenCalled();
    expect(mocks.deleteMany).not.toHaveBeenCalled();
  });
});
