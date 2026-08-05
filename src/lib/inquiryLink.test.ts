import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/verification";
import { consumeLinkToken } from "@/lib/inquiryLink";

/**
 * 실제(테스트 전용) DB를 쓴다 — passwordReset.test.ts와 같은 이유: 이 파일이
 * 검증하는 건 "동시 요청 중 정확히 하나만 성공한다"는 DB 트랜잭션의 원자성
 * 자체이므로 mock으로는 의미 있게 검증할 수 없다.
 */

async function createTestUser() {
  return prisma.user.create({
    data: {
      email: `inquiry-link-test-${randomUUID()}@example.com`,
      passwordHash: "irrelevant-for-this-test",
      name: "테스트 사용자",
    },
  });
}

async function createTestInquiry(overrides: { userId?: string | null } = {}) {
  return prisma.inquiry.create({
    data: {
      name: "문의자",
      email: `inquiry-link-test-${randomUUID()}@example.com`,
      phone: "010-0000-0000",
      type: "개인 고객 문의",
      message: "테스트 문의 내용입니다.",
      privacyAgreedAt: new Date(),
      userId: overrides.userId ?? null,
    },
  });
}

async function createToken(
  inquiryId: string,
  userId: string,
  overrides: { expiresAt?: Date; usedAt?: Date | null } = {},
) {
  const token = randomUUID();
  await prisma.inquiryLinkToken.create({
    data: {
      inquiryId,
      userId,
      tokenHash: hashSecret(token),
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
      usedAt: overrides.usedAt ?? null,
    },
  });
  return token;
}

describe("consumeLinkToken", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a token that doesn't exist", async () => {
    const user = await createTestUser();
    const result = await consumeLinkToken({ token: "never-issued", userId: user.id });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired token", async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry();
    const token = await createToken(inquiry.id, user.id, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await consumeLinkToken({ token, userId: user.id });

    expect(result.ok).toBe(false);
    const unchanged = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(unchanged.userId).toBeNull();
  });

  it("rejects a token that was already used", async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry();
    const token = await createToken(inquiry.id, user.id, { usedAt: new Date() });

    const result = await consumeLinkToken({ token, userId: user.id });

    expect(result.ok).toBe(false);
  });

  it("rejects when the logged-in user doesn't match the token's issued user", async () => {
    const user = await createTestUser();
    const otherUser = await createTestUser();
    const inquiry = await createTestInquiry();
    const token = await createToken(inquiry.id, user.id);

    const result = await consumeLinkToken({ token, userId: otherUser.id });

    expect(result.ok).toBe(false);
    const unchanged = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(unchanged.userId).toBeNull();
  });

  it("links the inquiry to the user on success", async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry();
    const token = await createToken(inquiry.id, user.id);

    const result = await consumeLinkToken({ token, userId: user.id });

    expect(result).toEqual({ ok: true, inquiryId: inquiry.id });
    const linked = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(linked.userId).toBe(user.id);
  });

  it("rejects if the inquiry was already linked by other means before consumption", async () => {
    const user = await createTestUser();
    const someoneElse = await createTestUser();
    const inquiry = await createTestInquiry({ userId: someoneElse.id });
    const token = await createToken(inquiry.id, user.id);

    const result = await consumeLinkToken({ token, userId: user.id });

    expect(result.ok).toBe(false);
    const unchanged = await prisma.inquiry.findUniqueOrThrow({ where: { id: inquiry.id } });
    expect(unchanged.userId).toBe(someoneElse.id);
  });

  it("rejects reusing a token that this same call just consumed", async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry();
    const token = await createToken(inquiry.id, user.id);

    const first = await consumeLinkToken({ token, userId: user.id });
    expect(first.ok).toBe(true);

    const second = await consumeLinkToken({ token, userId: user.id });
    expect(second.ok).toBe(false);
  });

  it("lets exactly one of two concurrent requests for the same token succeed", async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry();
    const token = await createToken(inquiry.id, user.id);

    const [a, b] = await Promise.all([
      consumeLinkToken({ token, userId: user.id }),
      consumeLinkToken({ token, userId: user.id }),
    ]);

    const successes = [a, b].filter((result) => result.ok);
    expect(successes).toHaveLength(1);
  });

  it("invalidates the inquiry's other unused link tokens on success", async () => {
    const user = await createTestUser();
    const inquiry = await createTestInquiry();
    const usedToken = await createToken(inquiry.id, user.id);
    const otherToken = await createToken(inquiry.id, user.id);

    const result = await consumeLinkToken({ token: usedToken, userId: user.id });
    expect(result.ok).toBe(true);

    const followUp = await consumeLinkToken({ token: otherToken, userId: user.id });
    expect(followUp.ok).toBe(false);
  });
});
