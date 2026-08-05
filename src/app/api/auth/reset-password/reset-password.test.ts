import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  findUnique: vi.fn(),
  updateMany: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
  formatRetryAfter: vi.fn(),
  getClientIp: vi.fn(() => "127.0.0.1"),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { $transaction: mocks.transaction },
}));

import { POST } from "@/app/api/auth/reset-password/route";

function request() {
  return new Request("http://localhost/api/auth/reset-password", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: "valid-token", password: "new-password" }),
  });
}

describe("password reset token consumption", () => {
  beforeEach(() => {
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.findUnique.mockResolvedValue({ id: "token-1", userId: "user-1" });
    mocks.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValue({ count: 1 });
    mocks.userUpdate.mockResolvedValue({});
    mocks.transaction.mockImplementation((callback) =>
      callback({
        passwordResetToken: {
          findUnique: mocks.findUnique,
          updateMany: mocks.updateMany,
        },
        user: { update: mocks.userUpdate },
      }),
    );
  });

  it("increments authVersion when a token is claimed", async () => {
    const response = await POST(request());

    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        passwordHash: expect.any(String),
        authVersion: { increment: 1 },
      },
    });
  });

  it("rejects an expired or already claimed token without changing the password", async () => {
    mocks.updateMany.mockReset().mockResolvedValue({ count: 0 });

    const response = await POST(request());

    expect(response.status).toBe(400);
    expect(mocks.userUpdate).not.toHaveBeenCalled();
  });
});
