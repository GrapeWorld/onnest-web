import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectPropertySuggestion: {
      findUnique: mocks.findUnique,
      findFirst: mocks.findFirst,
      update: mocks.update,
    },
  },
}));

import { PATCH as PATCH_EDIT } from "@/app/api/admin/property-suggestions/[id]/route";
import { PATCH as PATCH_WITHDRAW } from "@/app/api/admin/property-suggestions/[id]/withdraw/route";

const params = Promise.resolve({ id: "suggestion-1" });
const validInput = {
  sourceUrl: "https://fin.land.naver.com/complexes/123",
  title: "거제 아파트",
};

function editRequest(body: unknown) {
  return new Request("http://localhost/api/admin/property-suggestions/suggestion-1", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/property-suggestions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", projectId: "project-1", withdrawnAt: null });
    mocks.findFirst.mockResolvedValue(null);
    mocks.update.mockResolvedValue({});
  });

  it("rejects a viewer-only admin", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "viewer" });
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("404s for an unknown suggestion", async () => {
    mocks.findUnique.mockResolvedValue(null);
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(404);
  });

  it("blocks editing an already withdrawn suggestion", async () => {
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", projectId: "project-1", withdrawnAt: new Date() });
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("blocks changing sourceUrl to one already shared in the same project", async () => {
    mocks.findFirst.mockResolvedValue({ id: "other-suggestion" });
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates fields for a valid edit", async () => {
    const response = await PATCH_EDIT(editRequest(validInput), { params });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "suggestion-1" } }),
    );
  });
});

describe("PATCH /api/admin/property-suggestions/[id]/withdraw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", withdrawnAt: null });
    mocks.update.mockResolvedValue({});
  });

  function withdrawRequest() {
    return new Request("http://localhost/api/admin/property-suggestions/suggestion-1/withdraw", {
      method: "PATCH",
    });
  }

  it("rejects a viewer-only admin", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "viewer" });
    const response = await PATCH_WITHDRAW(withdrawRequest(), { params });
    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("soft-deletes by setting withdrawnAt, not a real delete", async () => {
    const response = await PATCH_WITHDRAW(withdrawRequest(), { params });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "suggestion-1" },
      data: { withdrawnAt: expect.any(Date) },
    });
  });

  it("rejects withdrawing an already-withdrawn suggestion", async () => {
    mocks.findUnique.mockResolvedValue({ id: "suggestion-1", withdrawnAt: new Date() });
    const response = await PATCH_WITHDRAW(withdrawRequest(), { params });
    expect(response.status).toBe(409);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
