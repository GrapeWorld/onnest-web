import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  projectFindUnique: vi.fn(),
  suggestionFindMany: vi.fn(),
  suggestionFindFirst: vi.fn(),
  suggestionCreate: vi.fn(),
  actionItemCreate: vi.fn(),
  transaction: vi.fn(),
  notifyServiceRequestCustomer: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isAdmin: (user: { adminRole: string | null }) => user.adminRole === "super" || user.adminRole === "viewer",
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findUnique: mocks.projectFindUnique },
    projectPropertySuggestion: {
      findMany: mocks.suggestionFindMany,
      findFirst: mocks.suggestionFindFirst,
      create: mocks.suggestionCreate,
    },
    actionItem: { upsert: mocks.actionItemCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  notifyServiceRequestCustomer: mocks.notifyServiceRequestCustomer,
  escapeHtml: (value: string) => value,
}));

import { GET, POST } from "@/app/api/admin/projects/[projectId]/property-suggestions/route";

function req(body?: unknown) {
  return new Request("http://localhost/api/admin/projects/project-1/property-suggestions", {
    method: body ? "POST" : "GET",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const params = Promise.resolve({ projectId: "project-1" });
const validInput = {
  sourceUrl: "https://fin.land.naver.com/complexes/123",
  title: "거제 아파트",
  address: "경상남도 거제시",
  transactionType: "전세",
  deposit: 200_000_000,
  sharedReason: "희망 지역과 예산에 맞습니다.",
};

describe("GET /api/admin/projects/[projectId]/property-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows a viewer-only admin to list", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "viewer" });
    mocks.suggestionFindMany.mockResolvedValue([]);
    const response = await GET(req(), { params });
    expect(response.status).toBe(200);
  });

  it("rejects a non-admin with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", adminRole: null });
    const response = await GET(req(), { params });
    expect(response.status).toBe(403);
  });
});

describe("POST /api/admin/projects/[projectId]/property-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super", name: "관리자", email: "admin@onnesthome.com" });
    mocks.projectFindUnique.mockResolvedValue({
      id: "project-1",
      name: "거제 이사",
      user: { id: "customer-1", email: "customer@example.com", name: "고객" },
    });
    mocks.suggestionFindFirst.mockResolvedValue(null);
    mocks.suggestionCreate.mockResolvedValue({ id: "suggestion-1" });
    mocks.actionItemCreate.mockResolvedValue({});
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        projectPropertySuggestion: { create: mocks.suggestionCreate },
        actionItem: { upsert: mocks.actionItemCreate },
      }),
    );
  });

  it("rejects a viewer-only admin (read-only) with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "viewer" });
    const response = await POST(req(validInput), { params });
    expect(response.status).toBe(403);
    expect(mocks.suggestionCreate).not.toHaveBeenCalled();
  });

  it("rejects an unsafe URL scheme", async () => {
    const response = await POST(req({ ...validInput, sourceUrl: "javascript:alert(1)" }), { params });
    expect(response.status).toBe(400);
    expect(mocks.suggestionCreate).not.toHaveBeenCalled();
  });

  it("404s when the project does not exist", async () => {
    mocks.projectFindUnique.mockResolvedValue(null);
    const response = await POST(req(validInput), { params });
    expect(response.status).toBe(404);
  });

  it("blocks sharing the same URL twice in the same project", async () => {
    mocks.suggestionFindFirst.mockResolvedValue({ id: "existing-suggestion" });
    const response = await POST(req(validInput), { params });
    expect(response.status).toBe(409);
    expect(mocks.suggestionCreate).not.toHaveBeenCalled();
  });

  it("creates the suggestion with an admin snapshot and notifies the project owner", async () => {
    const response = await POST(req(validInput), { params });
    expect(response.status).toBe(201);
    expect(mocks.suggestionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          projectId: "project-1",
          sharedById: "admin-1",
          sharedByName: "관리자",
          sharedByEmail: "admin@onnesthome.com",
        }),
      }),
    );
    expect(mocks.notifyServiceRequestCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "customer@example.com" }),
    );
  });

  it("never fetches the external listing URL itself", async () => {
    const originalFetch = global.fetch;
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await POST(req(validInput), { params });
    expect(fetchSpy).not.toHaveBeenCalled();

    global.fetch = originalFetch;
  });
});
