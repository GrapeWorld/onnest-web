import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    projectPropertySuggestion: {
      findMany: mocks.findMany,
      findFirst: mocks.findFirst,
      updateMany: mocks.updateMany,
      update: mocks.update,
    },
  },
}));

import { GET as GET_LIST } from "@/app/api/my/projects/[projectId]/property-suggestions/route";
import { GET as GET_ONE } from "@/app/api/my/property-suggestions/[id]/route";
import { PATCH as PATCH_RESPONSE } from "@/app/api/my/property-suggestions/[id]/response/route";

const listParams = Promise.resolve({ projectId: "project-1" });
const oneParams = Promise.resolve({ id: "suggestion-1" });

function listRequest() {
  return new Request("http://localhost/api/my/projects/project-1/property-suggestions");
}
function oneRequest() {
  return new Request("http://localhost/api/my/property-suggestions/suggestion-1");
}
function responseRequest(body: unknown) {
  return new Request("http://localhost/api/my/property-suggestions/suggestion-1/response", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("GET /api/my/projects/[projectId]/property-suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await GET_LIST(listRequest(), { params: listParams });
    expect(response.status).toBe(401);
  });

  it("scopes the query to the current user's own project", async () => {
    mocks.findMany.mockResolvedValue([]);
    await GET_LIST(listRequest(), { params: listParams });
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId: "project-1", project: { userId: "user-1" }, withdrawnAt: null },
      }),
    );
  });

  it("never selects adminMemo or the sharer's identity", async () => {
    mocks.findMany.mockResolvedValue([]);
    await GET_LIST(listRequest(), { params: listParams });
    const call = mocks.findMany.mock.calls[0][0];
    expect(call.select).not.toHaveProperty("adminMemo");
    expect(call.select).not.toHaveProperty("sharedByName");
    expect(call.select).not.toHaveProperty("sharedByEmail");
    expect(call.select).not.toHaveProperty("sharedById");
  });

  it("reports newCount from a pure read, without mutating anything", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "s1", customerStatus: "NEW" },
      { id: "s2", customerStatus: "VIEWED" },
    ]);
    const response = await GET_LIST(listRequest(), { params: listParams });
    const data = await response.json();
    expect(data.newCount).toBe(1);
    // 목록 조회 자체가 상태를 바꾸지 않는다 — Next.js Link 프리페치가 이
    // 라우트를 경합적으로 여러 번 호출해도 "새로 공유됨" 배지가 사라지지
    // 않아야 한다(예전에 있던 부수효과 버그의 회귀 방지).
    expect(mocks.updateMany).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("stays NEW indefinitely on repeated reads until the customer responds", async () => {
    mocks.findMany.mockResolvedValue([{ id: "s1", customerStatus: "NEW" }]);
    const first = await (await GET_LIST(listRequest(), { params: listParams })).json();
    const second = await (await GET_LIST(listRequest(), { params: listParams })).json();
    expect(first.newCount).toBe(1);
    expect(second.newCount).toBe(1);
  });
});

describe("GET /api/my/property-suggestions/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
  });

  it("404s when the suggestion doesn't belong to the current user (no leak of existence)", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await GET_ONE(oneRequest(), { params: oneParams });
    expect(response.status).toBe(404);
  });

  it("scopes by project ownership and excludes withdrawn shares", async () => {
    mocks.findFirst.mockResolvedValue({ id: "suggestion-1" });
    await GET_ONE(oneRequest(), { params: oneParams });
    expect(mocks.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "suggestion-1", project: { userId: "user-1" }, withdrawnAt: null },
      }),
    );
  });
});

describe("PATCH /api/my/property-suggestions/[id]/response", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.findFirst.mockResolvedValue({ id: "suggestion-1", withdrawnAt: null, savedCandidatePropertyId: null });
    mocks.update.mockResolvedValue({});
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);
    const response = await PATCH_RESPONSE(responseRequest({ customerStatus: "INTERESTED" }), { params: oneParams });
    expect(response.status).toBe(401);
  });

  it("404s for another customer's suggestion", async () => {
    mocks.findFirst.mockResolvedValue(null);
    const response = await PATCH_RESPONSE(responseRequest({ customerStatus: "INTERESTED" }), { params: oneParams });
    expect(response.status).toBe(404);
  });

  it("blocks responding to a withdrawn share", async () => {
    mocks.findFirst.mockResolvedValue({ id: "suggestion-1", withdrawnAt: new Date(), savedCandidatePropertyId: null });
    const response = await PATCH_RESPONSE(responseRequest({ customerStatus: "INTERESTED" }), { params: oneParams });
    expect(response.status).toBe(409);
  });

  it("blocks changing the response once already saved as a candidate property", async () => {
    mocks.findFirst.mockResolvedValue({ id: "suggestion-1", withdrawnAt: null, savedCandidatePropertyId: "candidate-1" });
    const response = await PATCH_RESPONSE(responseRequest({ customerStatus: "NOT_INTERESTED" }), { params: oneParams });
    expect(response.status).toBe(409);
  });

  it("rejects a system-managed status like SAVED from the customer", async () => {
    const response = await PATCH_RESPONSE(responseRequest({ customerStatus: "SAVED" }), { params: oneParams });
    expect(response.status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("updates the customer's own response and memo", async () => {
    const response = await PATCH_RESPONSE(
      responseRequest({ customerStatus: "ON_HOLD", customerMemo: "조금 더 볼게요" }),
      { params: oneParams },
    );
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "suggestion-1" },
      data: { customerStatus: "ON_HOLD", customerMemo: "조금 더 볼게요", respondedAt: expect.any(Date) },
    });
  });
});
