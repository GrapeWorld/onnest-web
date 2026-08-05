import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst: mocks.findFirst },
    handover: { upsert: mocks.upsert },
  },
}));

import { PUT } from "@/app/api/projects/[id]/handover/route";

function call(body: unknown, id = "project-1") {
  const request = new Request(`http://localhost/api/projects/${id}/handover`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PUT(request, { params: Promise.resolve({ id }) });
}

const validBody = {
  summary: "채광이 좋고 오후에 햇빛이 잘 듭니다.",
  items: [{ label: "채광", note: "남향이라 오후까지 밝습니다." }],
};

describe("PUT /api/projects/[id]/handover", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.findFirst.mockResolvedValue({ id: "project-1" });
    mocks.upsert.mockResolvedValue({ id: "handover-1" });
  });

  it("resets moderation fields to pending on every save", async () => {
    const response = await call(validBody);

    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project-1" },
        update: expect.objectContaining({
          moderationStatus: "pending",
          moderationReason: null,
          moderatedAt: null,
          moderatorId: null,
          moderatorEmail: null,
        }),
      }),
    );
  });

  it("does not set moderation fields on the create branch (column default applies)", async () => {
    await call(validBody);

    const args = mocks.upsert.mock.calls[0][0];
    expect(args.create).not.toHaveProperty("moderationStatus");
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call(validBody);

    expect(response.status).toBe(401);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("returns 404 for a project the caller does not own", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await call(validBody);

    expect(response.status).toBe(404);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
