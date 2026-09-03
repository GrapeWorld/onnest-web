import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  projectCreate: vi.fn(),
  stepStateCreate: vi.fn(),
  candidateUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { create: mocks.projectCreate },
    projectStepState: { create: mocks.stepStateCreate },
    candidateProperty: { updateMany: mocks.candidateUpdateMany },
    $transaction: mocks.transaction,
  },
}));

import { POST } from "@/app/api/projects/route";

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    spaceCategory: "residential",
    spaceSubtype: "apartment",
    addressPending: false,
    address: "서울시 강남구 테헤란로",
    addressDetail: "",
    unitNumber: "",
    transactionType: "jeonse",
    details: {},
    projectStage: "searching",
    scheduleUndecided: false,
    moveInDate: "",
    contractDate: "",
    name: "테스트 프로젝트",
    budget: "",
    ...overrides,
  };
}

function call(body: unknown) {
  const request = new Request("http://localhost/api/projects", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/projects — initial step state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.projectCreate.mockResolvedValue({ id: "project-1" });
    mocks.stepStateCreate.mockResolvedValue({});
    mocks.candidateUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        project: { create: mocks.projectCreate },
        projectStepState: { create: mocks.stepStateCreate },
        candidateProperty: { updateMany: mocks.candidateUpdateMany },
      }),
    );
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call(baseInput());

    expect(response.status).toBe(401);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("creates the project and its starting step state in one transaction", async () => {
    const response = await call(baseInput({ projectStage: "searching" }));

    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.stepStateCreate).toHaveBeenCalledWith({
      data: { projectId: "project-1", slug: "candidate", status: "진행 중" },
    });
  });

  it.each([
    ["searching", "candidate"],
    ["candidate_selected", "handover-check"],
    ["visit_planned", "visit-check"],
    ["contract_review", "safety-checkpass"],
    ["contract_completed", "move-cleaning"],
    ["move_in_preparing", "internet-repair"],
  ])("maps projectStage %s to starting step %s", async (projectStage, expectedSlug) => {
    await call(baseInput({ projectStage }));

    expect(mocks.stepStateCreate).toHaveBeenCalledWith({
      data: { projectId: "project-1", slug: expectedSlug, status: "진행 중" },
    });
  });

  it("does not create any step state for other stages", async () => {
    await call(baseInput({ projectStage: "contract_completed" }));

    expect(mocks.stepStateCreate).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/projects — 매물 후보 연결(sourceCandidatePropertyId)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1" });
    mocks.projectCreate.mockResolvedValue({ id: "project-1" });
    mocks.stepStateCreate.mockResolvedValue({});
    mocks.candidateUpdateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        project: { create: mocks.projectCreate },
        projectStepState: { create: mocks.stepStateCreate },
        candidateProperty: { updateMany: mocks.candidateUpdateMany },
      }),
    );
  });

  it("does not touch candidateProperty when no sourceCandidatePropertyId is sent", async () => {
    const response = await call(baseInput());

    expect(response.status).toBe(201);
    expect(mocks.candidateUpdateMany).not.toHaveBeenCalled();
  });

  it("links the candidate property, scoped to the current user and only if not already linked", async () => {
    const response = await call(baseInput({ sourceCandidatePropertyId: "candidate-1" }));

    expect(response.status).toBe(201);
    expect(mocks.candidateUpdateMany).toHaveBeenCalledWith({
      where: { id: "candidate-1", userId: "user-1", linkedProjectId: null },
      data: { linkedProjectId: "project-1", status: "최종 후보", selectedAt: expect.any(Date) },
    });
  });

  it("rolls back the whole transaction (no project, no step state) when the candidate link update matches nothing", async () => {
    mocks.candidateUpdateMany.mockResolvedValue({ count: 0 });

    const response = await call(baseInput({ sourceCandidatePropertyId: "someone-elses-candidate" }));
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "이 매물 후보를 프로젝트에 연결할 수 없습니다. 이미 연결되었거나 사용할 수 없는 매물인지 확인해주세요.",
    );
  });

  it("returns 409 for a nonexistent candidate id (same updateMany-count-0 path, same safe message)", async () => {
    mocks.candidateUpdateMany.mockResolvedValue({ count: 0 });

    const response = await call(baseInput({ sourceCandidatePropertyId: "does-not-exist" }));

    expect(response.status).toBe(409);
  });

  it("returns 409 when the candidate is already linked to another project (same updateMany-count-0 path)", async () => {
    mocks.candidateUpdateMany.mockResolvedValue({ count: 0 });

    const response = await call(baseInput({ sourceCandidatePropertyId: "already-linked-candidate" }));

    expect(response.status).toBe(409);
  });

  it("rejects a non-string sourceCandidatePropertyId with 400 before starting the transaction", async () => {
    const response = await call(baseInput({ sourceCandidatePropertyId: 12345 }));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an empty-string sourceCandidatePropertyId with 400 before starting the transaction", async () => {
    const response = await call(baseInput({ sourceCandidatePropertyId: "" }));

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
