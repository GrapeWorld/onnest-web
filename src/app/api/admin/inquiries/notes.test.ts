import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  inquiryFindUnique: vi.fn(),
  activityCreate: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    inquiry: { findUnique: mocks.inquiryFindUnique },
    inquiryActivity: { create: mocks.activityCreate },
  },
}));

import { POST } from "@/app/api/admin/inquiries/[id]/notes/route";

function call(body: unknown, id = "inquiry-1") {
  const request = new Request(`http://localhost/api/admin/inquiries/${id}/notes`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/inquiries/[id]/notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      name: "관리자",
      adminRole: "super",
    });
    mocks.inquiryFindUnique.mockResolvedValue({ id: "inquiry-1" });
    mocks.activityCreate.mockResolvedValue({ id: "activity-1" });
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({ body: "메모" });

    expect(response.status).toBe(403);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call({ body: "메모" });

    expect(response.status).toBe(403);
  });

  it("rejects an empty note body", async () => {
    const response = await call({ body: "" });
    expect(response.status).toBe(400);
  });

  it("rejects a note longer than 2000 characters", async () => {
    const response = await call({ body: "a".repeat(2001) });
    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing inquiry", async () => {
    mocks.inquiryFindUnique.mockResolvedValue(null);

    const response = await call({ body: "메모" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("문의를 찾을 수 없습니다.");
  });

  it("creates a NOTE_ADDED activity", async () => {
    const response = await call({ body: "고객이 오후에 다시 전화 요청" });

    expect(response.status).toBe(201);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: {
        inquiryId: "inquiry-1",
        action: "NOTE_ADDED",
        note: "고객이 오후에 다시 전화 요청",
        actorId: "admin-1",
        actorEmail: "admin@onnesthome.com",
        actorName: "관리자",
      },
    });
  });
});
