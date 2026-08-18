import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  upsert: vi.fn(),
  checkRateLimit: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    candidateProperty: { findFirst: mocks.findFirst },
    propertyVisitCheckItem: { upsert: mocks.upsert },
  },
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: (s: number) => `${s}초`,
}));

import { PUT } from "@/app/api/my/candidate-properties/[id]/visit-checklist/route";

function call(body: unknown, id = "candidate-1") {
  const request = new Request(`http://localhost/api/my/candidate-properties/${id}/visit-checklist`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PUT(request, { params: Promise.resolve({ id }) });
}

describe("PUT /api/my/candidate-properties/[id]/visit-checklist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.findFirst.mockResolvedValue({ id: "candidate-1" });
    mocks.upsert.mockResolvedValue({});
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await call({ label: "소음", checked: true });
    expect(response.status).toBe(401);
  });

  it("rejects a label outside the fixed checklist", async () => {
    const response = await call({ label: "임의 항목", checked: true });
    expect(response.status).toBe(400);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("blocks writing a checklist item on another user's candidate property", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await call({ label: "소음", checked: true });
    expect(response.status).toBe(404);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("upserts a valid checklist item scoped to the candidate property", async () => {
    const response = await call({ label: "소음", checked: true });
    expect(response.status).toBe(200);
    expect(mocks.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { candidatePropertyId_label: { candidatePropertyId: "candidate-1", label: "소음" } },
        create: { candidatePropertyId: "candidate-1", label: "소음", checked: true },
        update: { checked: true },
      }),
    );
  });
});
