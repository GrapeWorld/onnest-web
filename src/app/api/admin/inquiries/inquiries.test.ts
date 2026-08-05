import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  inquiryFindUnique: vi.fn(),
  inquiryUpdate: vi.fn(),
  userFindUnique: vi.fn(),
  activityCreate: vi.fn(),
  transaction: vi.fn(),
  notifyInquiryCustomer: vi.fn(),
  notifyInquiryAssignee: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    inquiry: { findUnique: mocks.inquiryFindUnique, update: mocks.inquiryUpdate },
    user: { findUnique: mocks.userFindUnique },
    inquiryActivity: { create: mocks.activityCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/email", () => ({
  escapeHtml: (value: string) => value,
  notifyInquiryCustomer: mocks.notifyInquiryCustomer,
  notifyInquiryAssignee: mocks.notifyInquiryAssignee,
}));

import { PATCH } from "@/app/api/admin/inquiries/[id]/route";

function call(body: unknown, id = "inquiry-1") {
  const request = new Request(`http://localhost/api/admin/inquiries/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("PATCH /api/admin/inquiries/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@onnesthome.com",
      name: "관리자",
      adminRole: "super",
    });
    mocks.inquiryFindUnique.mockResolvedValue({
      id: "inquiry-1",
      status: "신규",
      assigneeId: null,
      nextAction: null,
    });
    mocks.inquiryUpdate.mockImplementation(async ({ data }) => ({
      id: "inquiry-1",
      status: "신규",
      assigneeId: null,
      nextAction: null,
      email: "customer@example.com",
      name: "고객",
      ...data,
    }));
    mocks.userFindUnique.mockResolvedValue({
      id: "assignee-1",
      email: "viewer@onnesthome.com",
      name: "조회전용",
      adminRole: "viewer",
      status: "ACTIVE",
    });
    mocks.activityCreate.mockResolvedValue({});
    mocks.notifyInquiryCustomer.mockResolvedValue(undefined);
    mocks.notifyInquiryAssignee.mockResolvedValue(undefined);
    // 실제 라우트는 인터랙티브 트랜잭션(콜백)을 쓴다.
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        inquiry: { findUnique: mocks.inquiryFindUnique, update: mocks.inquiryUpdate },
        user: { findUnique: mocks.userFindUnique },
        inquiryActivity: { create: mocks.activityCreate },
      }),
    );
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call({ status: "검토 중" });

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call({ status: "검토 중" });

    expect(response.status).toBe(403);
  });

  it("rejects an invalid status", async () => {
    const response = await call({ status: "알 수 없음" });
    expect(response.status).toBe(400);
  });

  it("rejects an empty body with no recognized fields", async () => {
    const response = await call({});
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("변경할 내용이 없습니다.");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing inquiry", async () => {
    mocks.inquiryFindUnique.mockResolvedValue(null);

    const response = await call({ status: "검토 중" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("문의를 찾을 수 없습니다.");
  });

  it("changes status and records a STATUS_CHANGED activity", async () => {
    const response = await call({ status: "검토 중" });

    expect(response.status).toBe(200);
    expect(mocks.inquiryUpdate).toHaveBeenCalledWith({
      where: { id: "inquiry-1" },
      data: { status: "검토 중" },
      select: {
        id: true,
        status: true,
        assigneeId: true,
        nextAction: true,
        email: true,
        name: true,
      },
    });
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        inquiryId: "inquiry-1",
        action: "STATUS_CHANGED",
        changes: { from: "신규", to: "검토 중" },
        actorId: "admin-1",
        actorEmail: "admin@onnesthome.com",
        actorName: "관리자",
      }),
    });
  });

  it("notifies the customer when status actually changes", async () => {
    await call({ status: "검토 중" });

    expect(mocks.notifyInquiryCustomer).toHaveBeenCalledWith(
      expect.objectContaining({ to: "customer@example.com" }),
    );
  });

  it("does not notify the customer when only assignee/nextAction change (status unchanged)", async () => {
    await call({ assigneeId: "assignee-1" });

    expect(mocks.notifyInquiryCustomer).not.toHaveBeenCalled();
  });

  it("still returns 200 when the customer notification fails", async () => {
    mocks.notifyInquiryCustomer.mockRejectedValue(new Error("resend down"));

    const response = await call({ status: "검토 중" });

    expect(response.status).toBe(200);
  });

  it("assigns to a valid admin and records an ASSIGNED activity", async () => {
    const response = await call({ assigneeId: "assignee-1" });

    expect(response.status).toBe(200);
    expect(mocks.inquiryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { assigneeId: "assignee-1" } }),
    );
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "ASSIGNED",
        changes: {
          fromAssigneeId: null,
          toAssigneeId: "assignee-1",
          toAssigneeEmail: "viewer@onnesthome.com",
          toAssigneeName: "조회전용",
        },
      }),
    });
  });

  it("notifies the newly assigned admin by email", async () => {
    await call({ assigneeId: "assignee-1" });

    expect(mocks.notifyInquiryAssignee).toHaveBeenCalledWith(
      expect.objectContaining({ to: "viewer@onnesthome.com" }),
    );
  });

  it("does not notify anyone when unassigning", async () => {
    mocks.inquiryFindUnique.mockResolvedValue({
      id: "inquiry-1",
      status: "신규",
      assigneeId: "assignee-1",
      nextAction: null,
    });

    await call({ assigneeId: null });

    expect(mocks.notifyInquiryAssignee).not.toHaveBeenCalled();
  });

  it("still returns 200 when the assignee notification fails", async () => {
    mocks.notifyInquiryAssignee.mockRejectedValue(new Error("resend down"));

    const response = await call({ assigneeId: "assignee-1" });

    expect(response.status).toBe(200);
  });

  it("unassigns and records an UNASSIGNED activity", async () => {
    mocks.inquiryFindUnique.mockResolvedValue({
      id: "inquiry-1",
      status: "신규",
      assigneeId: "assignee-1",
      nextAction: null,
    });

    const response = await call({ assigneeId: null });

    expect(response.status).toBe(200);
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "UNASSIGNED",
        changes: {
          fromAssigneeId: "assignee-1",
          toAssigneeId: null,
          toAssigneeEmail: null,
          toAssigneeName: null,
        },
      }),
    });
  });

  it("blocks assigning to a non-admin member", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "member-1",
      email: "member@example.com",
      name: "일반회원",
      adminRole: null,
      status: "ACTIVE",
    });

    const response = await call({ assigneeId: "member-1" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("관리자 계정만 담당자로 지정할 수 있습니다.");
    expect(mocks.inquiryUpdate).not.toHaveBeenCalled();
  });

  it.each(["SUSPENDED", "WITHDRAWN", "BLOCKED", "PENDING", "DORMANT"])(
    "blocks assigning to a %s (non-ACTIVE) admin",
    async (status) => {
      mocks.userFindUnique.mockResolvedValue({
        id: "assignee-1",
        email: "viewer@onnesthome.com",
        name: "조회전용",
        adminRole: "viewer",
        status,
      });

      const response = await call({ assigneeId: "assignee-1" });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("활성 상태(ACTIVE)의 관리자만 담당자로 지정할 수 있습니다.");
      expect(mocks.inquiryUpdate).not.toHaveBeenCalled();
    },
  );

  it("returns 404 when the assignee does not exist", async () => {
    mocks.userFindUnique.mockResolvedValue(null);

    const response = await call({ assigneeId: "missing" });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("담당자를 찾을 수 없습니다.");
  });

  it("changes nextAction (including clearing it to null) and records an activity", async () => {
    mocks.inquiryFindUnique.mockResolvedValue({
      id: "inquiry-1",
      status: "신규",
      assigneeId: null,
      nextAction: "기존 액션",
    });

    const response = await call({ nextAction: "" });

    expect(response.status).toBe(200);
    expect(mocks.inquiryUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nextAction: null } }),
    );
    expect(mocks.activityCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "NEXT_ACTION_CHANGED",
        changes: { from: "기존 액션", to: null },
      }),
    });
  });

  it("rejects a request whose values match the current state exactly", async () => {
    mocks.inquiryFindUnique.mockResolvedValue({
      id: "inquiry-1",
      status: "신규",
      assigneeId: null,
      nextAction: null,
    });

    const response = await call({ status: "신규", nextAction: "" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("변경 사항이 없습니다.");
    expect(mocks.inquiryUpdate).not.toHaveBeenCalled();
  });

  it("creates one activity per changed field when multiple fields change together", async () => {
    const response = await call({ status: "검토 중", assigneeId: "assignee-1", nextAction: "전화" });

    expect(response.status).toBe(200);
    expect(mocks.activityCreate).toHaveBeenCalledTimes(3);
    const actions = mocks.activityCreate.mock.calls.map((call) => call[0].data.action);
    expect(actions).toEqual(
      expect.arrayContaining(["STATUS_CHANGED", "ASSIGNED", "NEXT_ACTION_CHANGED"]),
    );
  });

  it("returns 409 when the transaction fails due to a concurrent conflict", async () => {
    mocks.transaction.mockRejectedValue(new Error("could not serialize access"));

    const response = await call({ status: "검토 중" });
    const data = await response.json();

    expect(response.status).toBe(409);
    expect(data.error).toBe(
      "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요.",
    );
  });

  it("runs the update inside a Serializable transaction (closes the concurrent-edit race)", async () => {
    await call({ status: "검토 중" });

    expect(mocks.transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: "Serializable" },
    );
  });
});
