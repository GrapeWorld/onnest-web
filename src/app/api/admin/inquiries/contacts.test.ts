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

import { POST } from "@/app/api/admin/inquiries/[id]/contacts/route";

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    method: "전화",
    result: "통화 연결, 관심 있음",
    contactedAt: "2026-08-04T10:00:00.000Z",
    followUp: "내일 오전 재연락",
    ...overrides,
  };
}

function call(body: unknown, id = "inquiry-1") {
  const request = new Request(`http://localhost/api/admin/inquiries/${id}/contacts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/inquiries/[id]/contacts", () => {
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

    const response = await call(baseInput());

    expect(response.status).toBe(403);
    expect(mocks.activityCreate).not.toHaveBeenCalled();
  });

  it("rejects an invalid contact method", async () => {
    const response = await call(baseInput({ method: "비둘기" }));
    expect(response.status).toBe(400);
  });

  it("rejects an empty result", async () => {
    const response = await call(baseInput({ result: "" }));
    expect(response.status).toBe(400);
  });

  it("rejects an unparseable contactedAt", async () => {
    const response = await call(baseInput({ contactedAt: "not-a-date" }));
    expect(response.status).toBe(400);
  });

  it("returns 404 for a missing inquiry", async () => {
    mocks.inquiryFindUnique.mockResolvedValue(null);

    const response = await call(baseInput());
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("문의를 찾을 수 없습니다.");
  });

  it("creates a CONTACT_LOGGED activity without touching the inquiry itself", async () => {
    const response = await call(baseInput());

    expect(response.status).toBe(201);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: {
        inquiryId: "inquiry-1",
        action: "CONTACT_LOGGED",
        changes: {
          method: "전화",
          result: "통화 연결, 관심 있음",
          contactedAt: "2026-08-04T10:00:00.000Z",
          followUp: "내일 오전 재연락",
        },
        actorId: "admin-1",
        actorEmail: "admin@onnesthome.com",
        actorName: "관리자",
      },
    });
  });

  it("stores an empty followUp as null", async () => {
    await call(baseInput({ followUp: "" }));

    expect(mocks.activityCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          changes: expect.objectContaining({ followUp: null }),
        }),
      }),
    );
  });
});
