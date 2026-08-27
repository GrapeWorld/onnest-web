import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  projectFindFirst: vi.fn(),
  serviceRequestCreateMany: vi.fn(),
  userFindMany: vi.fn(),
  notificationCreateMany: vi.fn(),
  transaction: vi.fn(),
  notifyAdmin: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(() => "1분"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findFirst: mocks.projectFindFirst },
    serviceRequest: { createMany: mocks.serviceRequestCreateMany },
    user: { findMany: mocks.userFindMany },
    notification: { createMany: mocks.notificationCreateMany },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyAdmin: mocks.notifyAdmin,
}));

import { POST } from "@/app/api/projects/[id]/service-requests/route";

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    serviceTypes: ["이사"],
    region: "서울시 마포구",
    message: "",
    contactName: "홍길동",
    contactPhone: "010-1234-5678",
    agreePrivacy: true,
    ...overrides,
  };
}

function call(body: unknown) {
  const request = new Request("http://localhost/api/projects/project-1/service-requests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request, { params: Promise.resolve({ id: "project-1" }) });
}

describe("POST /api/projects/[id]/service-requests — admin notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.projectFindFirst.mockResolvedValue({ id: "project-1", name: "합정동 전세 프로젝트" });
    mocks.serviceRequestCreateMany.mockResolvedValue({ count: 1 });
    mocks.userFindMany.mockResolvedValue([{ id: "admin-1", adminRole: "super" }]);
    mocks.notificationCreateMany.mockResolvedValue({ count: 1 });
    mocks.notifyAdmin.mockResolvedValue(undefined);
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        serviceRequest: { createMany: mocks.serviceRequestCreateMany },
        user: { findMany: mocks.userFindMany },
        notification: { createMany: mocks.notificationCreateMany },
      }),
    );
  });

  it("creates the service request and notifies the admin", async () => {
    const response = await call(baseInput());

    expect(response.status).toBe(201);
    expect(mocks.serviceRequestCreateMany).toHaveBeenCalledTimes(1);
    expect(mocks.notifyAdmin).toHaveBeenCalledTimes(1);
    expect(mocks.notifyAdmin.mock.calls[0][0].subject).toContain("합정동 전세 프로젝트");
  });

  it("does not notify when the project is not found", async () => {
    mocks.projectFindFirst.mockResolvedValue(null);

    const response = await call(baseInput());

    expect(response.status).toBe(404);
    expect(mocks.serviceRequestCreateMany).not.toHaveBeenCalled();
    expect(mocks.notifyAdmin).not.toHaveBeenCalled();
  });

  it("still returns 201 when the notification fails", async () => {
    mocks.notifyAdmin.mockRejectedValue(new Error("resend down"));

    const response = await call(baseInput());
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.created).toBe(1);
  });
});
