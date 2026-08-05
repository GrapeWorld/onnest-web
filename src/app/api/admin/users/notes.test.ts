import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.findUnique },
    adminMemberNote: { create: mocks.create },
  },
}));

import { POST } from "@/app/api/admin/users/[id]/notes/route";

function call(body: unknown, id = "user-1") {
  const request = new Request(`http://localhost/api/admin/users/${id}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/users/[id]/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      adminRole: "super",
    });
    mocks.findUnique.mockResolvedValue({ id: "user-1" });
    mocks.create.mockResolvedValue({
      id: "note-1",
      body: "메모",
      authorEmail: "admin@onnesthome.com",
      createdAt: new Date(),
    });
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({ body: "메모 내용" });

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an empty note body", async () => {
    const response = await call({ body: "" });
    expect(response.status).toBe(400);
  });

  it("creates a note for a super admin", async () => {
    const response = await call({ body: "결제 문의 확인 필요" });
    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});
