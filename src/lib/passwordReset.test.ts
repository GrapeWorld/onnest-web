import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/verification";
import { consumeResetToken } from "@/lib/passwordReset";

/**
 * 실제(테스트 전용) DB를 쓴다. checkRateLimit처럼 mock으로 검증할 수 있는
 * 로직과 달리, 이 파일이 검증하는 건 "동시 요청 중 정확히 하나만 성공한다"는
 * DB 트랜잭션의 원자성 자체이므로 진짜 커넥션이 필요하다.
 */

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `reset-test-${randomUUID()}@example.com`,
      passwordHash: "irrelevant-for-this-test",
      name: "테스트 사용자",
    },
  });
}

async function createToken(
  userId: string,
  overrides: { expiresAt?: Date; usedAt?: Date | null } = {},
) {
  const token = randomUUID();
  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashSecret(token),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
      usedAt: overrides.usedAt ?? null,
    },
  });
  return token;
}

describe("consumeResetToken", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a token that doesn't exist", async () => {
    const result = await consumeResetToken({
      token: "never-issued",
      password: "newpassword1",
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired token", async () => {
    const user = await createTestUser();
    const token = await createToken(user.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await consumeResetToken({ token, password: "newpassword1" });

    expect(result.ok).toBe(false);
    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(unchanged.authVersion).toBe(0);
  });

  it("rejects a token that was already used", async () => {
    const user = await createTestUser();
    const token = await createToken(user.id, { usedAt: new Date() });

    const result = await consumeResetToken({ token, password: "newpassword1" });

    expect(result.ok).toBe(false);
  });

  it("rejects reusing a token that this same call just consumed", async () => {
    const user = await createTestUser();
    const token = await createToken(user.id);

    const first = await consumeResetToken({ token, password: "newpassword1" });
    expect(first.ok).toBe(true);

    const second = await consumeResetToken({ token, password: "anotherpassword2" });
    expect(second.ok).toBe(false);
  });

  it("lets exactly one of two concurrent requests for the same token succeed", async () => {
    const user = await createTestUser();
    const token = await createToken(user.id);

    const [a, b] = await Promise.all([
      consumeResetToken({ token, password: "passwordFromA1" }),
      consumeResetToken({ token, password: "passwordFromB1" }),
    ]);

    const successes = [a, b].filter((result) => result.ok);
    expect(successes).toHaveLength(1);

    // authVersion은 정확히 한 번만 올라가야 한다 — 둘 다 성공했다면 두 번
    // 올랐을 것이다.
    const updated = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updated.authVersion).toBe(1);
  });

  it("invalidates the user's other unused reset tokens on success", async () => {
    const user = await createTestUser();
    const usedToken = await createToken(user.id);
    const otherToken = await createToken(user.id);

    const result = await consumeResetToken({ token: usedToken, password: "newpassword1" });
    expect(result.ok).toBe(true);

    const followUp = await consumeResetToken({ token: otherToken, password: "newpassword2" });
    expect(followUp.ok).toBe(false);
  });
});
