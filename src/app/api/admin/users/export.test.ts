import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  findMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
  isSuperAdmin: (user: { adminRole: string | null }) => user.adminRole === "super",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: mocks.findMany } },
}));

import { GET } from "@/app/api/admin/users/export/route";

function call() {
  return GET(new Request("http://localhost/api/admin/users/export"));
}

describe("GET /api/admin/users/export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findMany.mockResolvedValue([]);
  });

  it("rejects viewer-grade admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "viewer-1", adminRole: "viewer" });

    const response = await call();

    expect(response.status).toBe(403);
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it("rejects non-admins with 403", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(403);
  });

  it("allows super admins", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });

    const response = await call();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
  });

  it("includes the member-classification columns in the CSV header", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });

    const response = await call();
    const csv = await response.text();
    const header = csv.split("\n")[0];

    expect(header).toContain("회원 구분");
    expect(header).toContain("관리자 등급");
    expect(header).toContain("연결 업체");
  });

  it("renders classification, admin grade, and connected partner per row", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });
    mocks.findMany.mockResolvedValue([
      {
        id: "u1",
        name: "김민준",
        email: "kim@example.com",
        phone: null,
        status: "ACTIVE",
        adminRole: null,
        memberType: "PARTNER",
        createdAt: new Date("2026-01-01"),
        lastLoginAt: null,
        partner: { name: "행복이사" },
        _count: { projects: 0 },
      },
    ]);

    const response = await call();
    const csv = await response.text();

    expect(csv).toContain("업체");
    expect(csv).toContain("행복이사");
  });

  it("applies the classification filter to the query", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "admin-1", adminRole: "super" });

    await GET(new Request("http://localhost/api/admin/users/export?type=PARTNER"));

    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { adminRole: null, memberType: "PARTNER" },
      }),
    );
  });
});
