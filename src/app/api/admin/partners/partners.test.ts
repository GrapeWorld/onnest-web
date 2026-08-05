import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  create: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    partner: {
      create: mocks.create,
      findUnique: mocks.findUnique,
      update: mocks.update,
    },
  },
}));

import { POST } from "@/app/api/admin/partners/route";
import { PATCH } from "@/app/api/admin/partners/[id]/route";

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin/partners", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function patchRequest(body: unknown, id = "partner-1") {
  const request = new Request(`http://localhost/api/admin/partners/${id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return PATCH(request, { params: Promise.resolve({ id }) });
}

describe("POST /api/admin/partners", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.create.mockResolvedValue({ id: "partner-1", name: "온네스트 이사" });
  });

  it("rejects non-super admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await POST(postRequest({ name: "테스트 업체", serviceType: "이사" }));

    expect(response.status).toBe(403);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("rejects an invalid service type", async () => {
    const response = await POST(postRequest({ name: "테스트 업체", serviceType: "택배" }));
    expect(response.status).toBe(400);
  });

  it("creates a partner with a valid payload", async () => {
    const response = await POST(
      postRequest({ name: "온네스트 이사", serviceType: "이사" }),
    );

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });
});

describe("PATCH /api/admin/partners/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.findUnique.mockResolvedValue({
      id: "partner-1",
      serviceType: "이사",
      _count: { requests: 0 },
    });
    mocks.update.mockResolvedValue({ id: "partner-1", active: false });
  });

  it("rejects non-super admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await patchRequest({ active: false });

    expect(response.status).toBe(403);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing partner", async () => {
    mocks.findUnique.mockResolvedValue(null);

    const response = await patchRequest({ active: false });

    expect(response.status).toBe(404);
  });

  it("deactivates a partner", async () => {
    const response = await patchRequest({ active: false });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: "partner-1" },
      data: { active: false },
    });
  });

  it("blocks a serviceType change when the partner has assigned requests", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "partner-1",
      serviceType: "이사",
      _count: { requests: 3 },
    });

    const response = await patchRequest({ serviceType: "입주청소" });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe(
      "배정된 신청이 있는 업체는 서비스 유형을 변경할 수 없습니다.",
    );
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("allows a serviceType change when the partner has no assigned requests", async () => {
    const response = await patchRequest({ serviceType: "입주청소" });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("allows updating other fields on a partner with assigned requests (only serviceType is locked)", async () => {
    mocks.findUnique.mockResolvedValue({
      id: "partner-1",
      serviceType: "이사",
      _count: { requests: 3 },
    });

    const response = await patchRequest({ contactName: "새 담당자" });

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });
});
