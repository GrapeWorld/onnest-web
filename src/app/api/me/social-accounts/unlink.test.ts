import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  checkRateLimit: vi.fn(),
  socialAccountFindUnique: vi.fn(),
  socialAccountCount: vi.fn(),
  socialAccountDelete: vi.fn(),
  userUpdate: vi.fn(),
  transaction: vi.fn(),
  sessionSave: vi.fn(),
  notificationCreate: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getCurrentUser: mocks.getCurrentUser,
}));
vi.mock("@/lib/rateLimit", () => ({
  checkRateLimit: mocks.checkRateLimit,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    socialAccount: {
      findUnique: mocks.socialAccountFindUnique,
      count: mocks.socialAccountCount,
      delete: mocks.socialAccountDelete,
    },
    user: { update: mocks.userUpdate },
    notification: { create: mocks.notificationCreate },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/session", () => ({
  getSession: vi.fn(async () => ({ save: mocks.sessionSave })),
}));
vi.mock("@/lib/email", () => ({
  sendEmail: mocks.sendEmail,
  escapeHtml: (value: string) => value,
}));

import { DELETE } from "@/app/api/me/social-accounts/[id]/route";

function call(id = "sa-1") {
  const request = new Request(`http://localhost/api/me/social-accounts/${id}`, {
    method: "DELETE",
  });
  return DELETE(request, { params: Promise.resolve({ id }) });
}

describe("DELETE /api/me/social-accounts/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCurrentUser.mockResolvedValue({
      id: "user-1",
      email: "user-1@example.com",
      name: "회원1",
      passwordHash: "hashed-password",
    });
    mocks.checkRateLimit.mockResolvedValue({ ok: true });
    mocks.socialAccountFindUnique.mockResolvedValue({ id: "sa-1", userId: "user-1" });
    mocks.socialAccountCount.mockResolvedValue(2);
    mocks.socialAccountDelete.mockResolvedValue({});
    mocks.userUpdate.mockResolvedValue({ authVersion: 5 });
    mocks.notificationCreate.mockResolvedValue({});
    mocks.sendEmail.mockResolvedValue({ sent: true });
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        socialAccount: { delete: mocks.socialAccountDelete },
        user: { update: mocks.userUpdate },
        notification: { create: mocks.notificationCreate },
      }),
    );
  });

  it("requires login", async () => {
    mocks.getCurrentUser.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(401);
    expect(mocks.socialAccountDelete).not.toHaveBeenCalled();
  });

  it("returns 404 for a connection that doesn't exist", async () => {
    mocks.socialAccountFindUnique.mockResolvedValue(null);

    const response = await call();

    expect(response.status).toBe(404);
  });

  it("returns 404 (not 403) for a connection owned by someone else", async () => {
    mocks.socialAccountFindUnique.mockResolvedValue({ id: "sa-1", userId: "someone-else" });

    const response = await call();

    expect(response.status).toBe(404);
    expect(mocks.socialAccountDelete).not.toHaveBeenCalled();
  });

  it("blocks removing the last login method when there's no password", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", passwordHash: null });
    mocks.socialAccountCount.mockResolvedValue(1);

    const response = await call();
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("마지막 남은 로그인 방법");
    expect(mocks.socialAccountDelete).not.toHaveBeenCalled();
  });

  it("allows removing a connection when a password exists, even if it's the only social account", async () => {
    mocks.socialAccountCount.mockResolvedValue(1);

    const response = await call();

    expect(response.status).toBe(200);
    expect(mocks.socialAccountDelete).toHaveBeenCalledWith({ where: { id: "sa-1" } });
  });

  it("allows removing one of several connected accounts even without a password", async () => {
    mocks.getCurrentUser.mockResolvedValue({ id: "user-1", passwordHash: null });
    mocks.socialAccountCount.mockResolvedValue(2);

    const response = await call();

    expect(response.status).toBe(200);
  });

  it("bumps authVersion and refreshes the current session", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(mocks.userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { authVersion: { increment: 1 } },
      select: { authVersion: true },
    });
    expect(mocks.sessionSave).toHaveBeenCalled();
  });

  it("creates an in-app notification and emails the account owner", async () => {
    const response = await call();

    expect(response.status).toBe(200);
    expect(mocks.notificationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ recipientUserId: "user-1", type: "SOCIAL_ACCOUNT_UNLINKED" }),
      }),
    );
    expect(mocks.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user-1@example.com" }),
    );
  });

  it("a failed notification email doesn't fail the request", async () => {
    mocks.sendEmail.mockRejectedValue(new Error("resend down"));

    const response = await call();

    expect(response.status).toBe(200);
  });
});
