import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  userFindUnique: vi.fn(),
  userDelete: vi.fn(),
  documentFindMany: vi.fn(),
  deleteProjectFiles: vi.fn(),
  bcryptCompare: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique, delete: mocks.userDelete },
    document: { findMany: mocks.documentFindMany },
  },
}));
vi.mock("@/lib/storage", () => ({
  deleteProjectFiles: mocks.deleteProjectFiles,
}));
vi.mock("bcryptjs", () => ({
  default: { compare: mocks.bcryptCompare },
}));
vi.mock("@/lib/session", () => ({
  getSession: mocks.getSession,
}));

import { POST } from "@/app/api/auth/delete-account/route";

function call(body: unknown) {
  const request = new Request("http://localhost/api/auth/delete-account", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return POST(request);
}

describe("POST /api/auth/delete-account", () => {
  let sessionObj: Record<string, unknown>;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", email: "user@example.com" });
    mocks.documentFindMany.mockResolvedValue([]);
    mocks.deleteProjectFiles.mockResolvedValue({ failedCount: 0, failedKeys: [] });
    mocks.userDelete.mockResolvedValue({});
    sessionObj = { destroy: vi.fn(), save: vi.fn() };
    mocks.getSession.mockResolvedValue(sessionObj);
  });

  describe("password-based accounts", () => {
    beforeEach(() => {
      mocks.userFindUnique.mockResolvedValue({ passwordHash: "hashed" });
    });

    it("requires a password when the account has one", async () => {
      const response = await call({});
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("비밀번호를 입력해주세요.");
      expect(mocks.userDelete).not.toHaveBeenCalled();
    });

    it("rejects an incorrect password", async () => {
      mocks.bcryptCompare.mockResolvedValue(false);

      const response = await call({ password: "wrong" });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe("비밀번호가 올바르지 않습니다.");
      expect(mocks.userDelete).not.toHaveBeenCalled();
    });

    it("deletes the account when the password matches", async () => {
      mocks.bcryptCompare.mockResolvedValue(true);

      const response = await call({ password: "correct" });

      expect(response.status).toBe(200);
      expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "user-1" } });
      expect(sessionObj.destroy).toHaveBeenCalled();
    });
  });

  describe("social-only accounts (passwordHash null)", () => {
    beforeEach(() => {
      mocks.userFindUnique.mockResolvedValue({ passwordHash: null });
    });

    it("rejects deletion without a recent delete-confirm re-auth", async () => {
      sessionObj.deleteApprovedAt = undefined;

      const response = await call({});
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe(
        "본인 확인이 필요합니다. 연결된 계정으로 다시 인증해주세요.",
      );
      expect(mocks.userDelete).not.toHaveBeenCalled();
      // 비밀번호 계정 경로로 새지 않는다 — bcrypt를 아예 호출하지 않는다.
      expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    });

    it("rejects deletion when the re-auth approval has expired (older than 5 minutes)", async () => {
      sessionObj.deleteApprovedAt = Date.now() - 6 * 60 * 1000;

      const response = await call({});

      expect(response.status).toBe(403);
      expect(mocks.userDelete).not.toHaveBeenCalled();
    });

    it("allows deletion within the approval window without a password", async () => {
      sessionObj.deleteApprovedAt = Date.now() - 30 * 1000;

      const response = await call({});

      expect(response.status).toBe(200);
      expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: "user-1" } });
    });
  });

  it("returns 401 when not logged in", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call({ password: "x" });

    expect(response.status).toBe(401);
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });
});
