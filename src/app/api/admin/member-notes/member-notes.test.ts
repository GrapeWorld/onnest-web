import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    adminMemberNote: { updateMany: mocks.updateMany },
  },
}));

import { PATCH } from "@/app/api/admin/member-notes/[noteId]/route";

function call(body: unknown, noteId = "note-1") {
  const request = new Request(`http://localhost/api/admin/member-notes/${noteId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ noteId }) });
}

describe("PATCH /api/admin/member-notes/[noteId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      adminRole: "super",
    });
    mocks.updateMany.mockResolvedValue({ count: 1 });
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({ body: "수정된 메모" });

    expect(response.status).toBe(403);
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing note", async () => {
    mocks.updateMany.mockResolvedValue({ count: 0 });

    const response = await call({ body: "수정된 메모" });

    expect(response.status).toBe(404);
  });

  it("updates the note for a super admin", async () => {
    const response = await call({ body: "수정된 메모" });

    expect(response.status).toBe(200);
    expect(mocks.updateMany).toHaveBeenCalledTimes(1);
  });
});
