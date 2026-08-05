import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  projectCreate: vi.fn(),
  stepStateCreate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { create: mocks.projectCreate },
    projectStepState: { create: mocks.stepStateCreate },
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
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        project: { create: mocks.projectCreate },
        projectStepState: { create: mocks.stepStateCreate },
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
