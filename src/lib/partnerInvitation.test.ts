import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/verification";
import { generatePartnerCode } from "@/lib/partnerCode";
import { consumeInvitation } from "@/lib/partnerInvitation";

/**
 * 실제(테스트 전용) DB를 쓴다 — passwordReset.test.ts·inquiryLink.test.ts와
 * 같은 이유: 이 파일이 검증하는 건 "동시에 서로 다른 초대를 수락해도 한
 * 사용자가 활성 멤버십을 두 개 갖지 못한다"는 Serializable 트랜잭션의
 * 원자성 자체이므로 mock으로는 의미 있게 검증할 수 없다.
 */

async function createTestUser(overrides: { email?: string; adminRole?: string | null } = {}) {
  return prisma.user.create({
    data: {
      email: overrides.email ?? `partner-invite-test-${randomUUID()}@example.com`,
      passwordHash: "irrelevant-for-this-test",
      name: "테스트 사용자",
      adminRole: overrides.adminRole ?? null,
    },
  });
}

async function createTestPartner() {
  return prisma.partner.create({
    data: { name: `테스트업체-${randomUUID()}`, serviceType: "이사", partnerCode: generatePartnerCode() },
  });
}

async function createInvitationRow(
  partnerId: string,
  email: string,
  overrides: { role?: string; expiresAt?: Date; usedAt?: Date | null; revokedAt?: Date | null } = {},
) {
  const token = randomUUID();
  const inviter = await createTestUser();
  const invitation = await prisma.partnerInvitation.create({
    data: {
      partnerId,
      email,
      role: overrides.role ?? "STAFF",
      tokenHash: hashSecret(token),
      invitedById: inviter.id,
      expiresAt: overrides.expiresAt ?? new Date(Date.now() + 30 * 60 * 1000),
      usedAt: overrides.usedAt ?? null,
      revokedAt: overrides.revokedAt ?? null,
    },
  });
  return { token, invitation };
}

describe("consumeInvitation", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("rejects a token that doesn't exist", async () => {
    const user = await createTestUser();
    const result = await consumeInvitation({
      token: "never-issued",
      user: { id: user.id, email: user.email, adminRole: user.adminRole },
    });
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects an expired invitation", async () => {
    const partner = await createTestPartner();
    const user = await createTestUser();
    const { token } = await createInvitationRow(partner.id, user.email, {
      expiresAt: new Date(Date.now() - 1000),
    });

    const result = await consumeInvitation({
      token,
      user: { id: user.id, email: user.email, adminRole: user.adminRole },
    });

    expect(result.ok).toBe(false);
    const memberships = await prisma.partnerMembership.findMany({ where: { userId: user.id } });
    expect(memberships).toHaveLength(0);
  });

  it("rejects an already-used invitation", async () => {
    const partner = await createTestPartner();
    const user = await createTestUser();
    const { token } = await createInvitationRow(partner.id, user.email, { usedAt: new Date() });

    const result = await consumeInvitation({
      token,
      user: { id: user.id, email: user.email, adminRole: user.adminRole },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects a revoked invitation", async () => {
    const partner = await createTestPartner();
    const user = await createTestUser();
    const { token } = await createInvitationRow(partner.id, user.email, { revokedAt: new Date() });

    const result = await consumeInvitation({
      token,
      user: { id: user.id, email: user.email, adminRole: user.adminRole },
    });

    expect(result.ok).toBe(false);
  });

  it("rejects when the accepting account's email doesn't match the invitation", async () => {
    const partner = await createTestPartner();
    const invitedEmail = `invited-${randomUUID()}@example.com`;
    const otherUser = await createTestUser();
    const { token } = await createInvitationRow(partner.id, invitedEmail);

    const result = await consumeInvitation({
      token,
      user: { id: otherUser.id, email: otherUser.email, adminRole: null },
    });

    expect(result).toEqual({ ok: false, reason: "email-mismatch" });
  });

  it("rejects an account that has adminRole set", async () => {
    const partner = await createTestPartner();
    const admin = await createTestUser({ adminRole: "super" });
    const { token } = await createInvitationRow(partner.id, admin.email);

    const result = await consumeInvitation({
      token,
      user: { id: admin.id, email: admin.email, adminRole: admin.adminRole },
    });

    expect(result).toEqual({ ok: false, reason: "admin-conflict" });
    const memberships = await prisma.partnerMembership.findMany({ where: { userId: admin.id } });
    expect(memberships).toHaveLength(0);
  });

  it("rejects an account that already has an active membership elsewhere", async () => {
    const partnerA = await createTestPartner();
    const partnerB = await createTestPartner();
    const user = await createTestUser();
    await prisma.partnerMembership.create({
      data: { partnerId: partnerA.id, userId: user.id, role: "STAFF", status: "ACTIVE" },
    });
    const { token } = await createInvitationRow(partnerB.id, user.email);

    const result = await consumeInvitation({
      token,
      user: { id: user.id, email: user.email, adminRole: null },
    });

    expect(result).toEqual({ ok: false, reason: "already-member" });
  });

  it("creates an ACTIVE membership and syncs User.memberType/partnerId on success", async () => {
    const partner = await createTestPartner();
    const user = await createTestUser();
    const { token, invitation } = await createInvitationRow(partner.id, user.email, { role: "MANAGER" });

    const result = await consumeInvitation({
      token,
      user: { id: user.id, email: user.email, adminRole: null },
    });

    expect(result).toEqual({ ok: true, partnerId: partner.id });

    const membership = await prisma.partnerMembership.findFirstOrThrow({
      where: { partnerId: partner.id, userId: user.id },
    });
    expect(membership.role).toBe("MANAGER");
    expect(membership.status).toBe("ACTIVE");
    expect(membership.invitedById).toBe(invitation.invitedById);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.memberType).toBe("PARTNER");
    expect(updatedUser.partnerId).toBe(partner.id);
    expect(updatedUser.authVersion).toBe(user.authVersion + 1);
  });

  it("reactivates a previously-REVOKED membership instead of violating the (partnerId, userId) unique constraint", async () => {
    const partner = await createTestPartner();
    const user = await createTestUser();
    // 예전에 이 업체 소속이었다가 해제된 직원 — @@unique([partnerId, userId])
    // 때문에 같은 (partner, user) 조합의 행이 이미 존재한다.
    const revoked = await prisma.partnerMembership.create({
      data: {
        partnerId: partner.id,
        userId: user.id,
        role: "STAFF",
        status: "REVOKED",
        joinedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    });
    const { token, invitation } = await createInvitationRow(partner.id, user.email, { role: "MANAGER" });

    const result = await consumeInvitation({
      token,
      user: { id: user.id, email: user.email, adminRole: null },
    });

    expect(result).toEqual({ ok: true, partnerId: partner.id });

    const memberships = await prisma.partnerMembership.findMany({
      where: { partnerId: partner.id, userId: user.id },
    });
    // create()가 아니라 기존 행을 재활성화했으므로 여전히 행은 하나뿐이다.
    expect(memberships).toHaveLength(1);
    expect(memberships[0].id).toBe(revoked.id);
    expect(memberships[0].status).toBe("ACTIVE");
    expect(memberships[0].role).toBe("MANAGER");
    expect(memberships[0].invitedById).toBe(invitation.invitedById);

    const updatedUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(updatedUser.memberType).toBe("PARTNER");
    expect(updatedUser.partnerId).toBe(partner.id);
  });

  it("invalidates the same email's other unused invitations to the same partner on success", async () => {
    const partner = await createTestPartner();
    const user = await createTestUser();
    const { token: usedToken } = await createInvitationRow(partner.id, user.email);
    const { invitation: siblingInvitation } = await createInvitationRow(partner.id, user.email);

    const result = await consumeInvitation({
      token: usedToken,
      user: { id: user.id, email: user.email, adminRole: null },
    });
    expect(result.ok).toBe(true);

    const sibling = await prisma.partnerInvitation.findUniqueOrThrow({
      where: { id: siblingInvitation.id },
    });
    expect(sibling.usedAt).not.toBeNull();
  });

  it("lets exactly one of two concurrent invitation accepts for the same user succeed", async () => {
    const partnerA = await createTestPartner();
    const partnerB = await createTestPartner();
    const user = await createTestUser();
    const { token: tokenA } = await createInvitationRow(partnerA.id, user.email);
    const { token: tokenB } = await createInvitationRow(partnerB.id, user.email);

    const [a, b] = await Promise.allSettled([
      consumeInvitation({ token: tokenA, user: { id: user.id, email: user.email, adminRole: null } }),
      consumeInvitation({ token: tokenB, user: { id: user.id, email: user.email, adminRole: null } }),
    ]);

    const succeeded = [a, b].filter(
      (outcome) => outcome.status === "fulfilled" && outcome.value.ok,
    );
    expect(succeeded).toHaveLength(1);

    const memberships = await prisma.partnerMembership.findMany({
      where: { userId: user.id, status: "ACTIVE" },
    });
    expect(memberships).toHaveLength(1);
  });
});
