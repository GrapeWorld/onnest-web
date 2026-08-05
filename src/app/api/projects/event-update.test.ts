import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectEvent: { findFirst: mocks.findFirst, update: mocks.update },
  },
}));

import { PATCH } from "@/app/api/projects/[id]/events/[eventId]/route";

function call(body: unknown, id = "project-1", eventId = "event-1") {
  const request = new Request(
    `http://localhost/api/projects/${id}/events/${eventId}`,
    {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return PATCH(request, { params: Promise.resolve({ id, eventId }) });
}

describe("PATCH /api/projects/[id]/events/[eventId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.findFirst.mockResolvedValue({ id: "event-1" });
    mocks.update.mockResolvedValue({
      id: "event-1",
      title: "전입신고",
      date: new Date("2026-09-01T00:00:00.000Z"),
      memo: null,
      done: false,
    });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call({ done: true });

    expect(response.status).toBe(401);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 for an event that doesn't belong to the caller", async () => {
    mocks.findFirst.mockResolvedValue(null);

    const response = await call({ done: true });

    expect(response.status).toBe(404);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("still supports the plain completion toggle", async () => {
    const response = await call({ done: true });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { done: true },
      select: { id: true, title: true, date: true, memo: true, done: true },
    });
  });

  it("updates title, date, and memo together", async () => {
    const response = await call({
      title: "전입신고 (수정)",
      date: "2026-09-05",
      memo: "주민센터 방문",
    });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: {
        title: "전입신고 (수정)",
        date: new Date("2026-09-05"),
        memo: "주민센터 방문",
      },
      select: { id: true, title: true, date: true, memo: true, done: true },
    });
  });

  it("clears memo when given an empty string", async () => {
    await call({ memo: "" });

    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "event-1" },
      data: { memo: null },
      select: { id: true, title: true, date: true, memo: true, done: true },
    });
  });

  it("rejects an empty title", async () => {
    const response = await call({ title: "" });
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects an invalid date", async () => {
    const response = await call({ date: "2026-02-30" });
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("rejects a malformed request body", async () => {
    const response = await call({ done: "yes" });
    expect(response.status).toBe(400);
  });
});
