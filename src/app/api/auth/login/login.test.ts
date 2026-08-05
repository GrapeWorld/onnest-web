import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  findUnique: vi.fn(),
  userUpdate: vi.fn(),
  bcryptCompare: vi.fn(),
  sessionSave: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: mocks.findUnique, update: mocks.userUpdate } },
}));
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => ({
    userId: undefined,
    authVersion: undefined,
    save: mocks.sessionSave,
  })),
}));
vi.mock("bcryptjs", () => ({
  default: { compare: mocks.bcryptCompare },
}));

import { POST } from "@/app/api/auth/login/route";

function request() {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "member@example.com", password: "correct-password" }),
  });
}

function makeUser(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "user-1",
    email: "member@example.com",
    passwordHash: "hash",
    authVersion: 0,
    name: "홍길동",
    status: "ACTIVE",
    ...overrides,
  };
}

describe("login status gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.bcryptCompare.mockResolvedValue(true);
    mocks.userUpdate.mockResolvedValue({});
  });

  it("allows an ACTIVE member to log in and records lastLoginAt", async () => {
    mocks.findUnique.mockResolvedValue(makeUser({ status: "ACTIVE" }));

    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.sessionSave).toHaveBeenCalled();
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { lastLoginAt: expect.any(Date) },
    });
  });

  it.each(["SUSPENDED", "WITHDRAWN", "BLOCKED"])(
    "rejects a %s member with the generic invalid-credentials error",
    async (status) => {
      mocks.findUnique.mockResolvedValue(makeUser({ status }));

      const response = await POST(request());
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
      expect(mocks.sessionSave).not.toHaveBeenCalled();
      expect(mocks.userUpdate).not.toHaveBeenCalled();
    },
  );

  it.each(["PENDING", "DORMANT"])(
    "still allows a %s member to log in (not in the blocked list)",
    async (status) => {
      mocks.findUnique.mockResolvedValue(makeUser({ status }));

      const response = await POST(request());

      expect(response.status).toBe(200);
      expect(mocks.sessionSave).toHaveBeenCalled();
    },
  );

  it("safely rejects login for a social-only account (passwordHash null) without calling bcrypt", async () => {
    mocks.findUnique.mockResolvedValue(makeUser({ passwordHash: null }));

    const response = await POST(request());
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("이메일 또는 비밀번호가 올바르지 않습니다.");
    expect(mocks.bcryptCompare).not.toHaveBeenCalled();
    expect(mocks.sessionSave).not.toHaveBeenCalled();
  });
});
