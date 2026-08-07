import { prisma } from "@/lib/prisma";
import { generateResetToken, hashSecret } from "@/lib/verification";

// 초대 링크의 유효기간. 직원 초대는 비밀번호 재설정보다 여유를 둔다 —
// 받는 사람이 계정을 새로 만들어야 할 수도 있어서다.
const INVITATION_TTL_MS = 72 * 60 * 60 * 1000;

export async function createInvitation({
  partnerId,
  email,
  role,
  invitedById,
}: {
  partnerId: string;
  email: string;
  role: string;
  invitedById: string;
}) {
  const token = generateResetToken();
  await prisma.partnerInvitation.create({
    data: {
      partnerId,
      email,
      role,
      tokenHash: hashSecret(token),
      invitedById,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    },
  });
  return token;
}

/**
 * 아직 쓸 수 있는(미사용·미취소·만료 전) 초대인지 확인한다. 페이지
 * 컴포넌트 본문에서 직접 Date.now()/new Date()를 호출하면 React 컴파일러
 * 순수성 규칙(react-hooks/purity)에 걸리므로, 그 호출을 이 lib 함수 안으로
 * 옮겨둔다.
 */
export function isInvitationUsable(
  invitation: { usedAt: Date | null; revokedAt: Date | null; expiresAt: Date },
  now: Date = new Date(),
) {
  return !invitation.usedAt && !invitation.revokedAt && invitation.expiresAt.getTime() > now.getTime();
}

export type ConsumeInvitationResult =
  | { ok: true; partnerId: string }
  | {
      ok: false;
      reason: "invalid" | "email-mismatch" | "admin-conflict" | "already-member";
    };

/**
 * 초대를 검증과 동시에 소비한다. consumeLinkToken(src/lib/inquiryLink.ts)과
 * 같은 원자적 소비 원칙에 더해, "한 사용자는 활성 멤버십을 하나만 가진다"는
 * 불변조건까지 지켜야 해서 Serializable 트랜잭션을 쓴다 — 서로 다른
 * 초대(다른 토큰) 두 개를 동시에 수락하는 경쟁은 조건부 updateMany
 * 하나만으로는 막을 수 없다(각자 다른 행을 원자적으로 갱신하므로 둘 다
 * 성공해버릴 수 있다).
 */
export async function consumeInvitation({
  token,
  user,
}: {
  token: string;
  user: { id: string; email: string; adminRole: string | null };
}): Promise<ConsumeInvitationResult> {
  const tokenHash = hashSecret(token);
  const now = new Date();

  // Serializable 충돌(동시에 서로 다른 초대를 수락하는 경쟁)은 여기서
  // 삼키지 않고 그대로 던진다 — 호출부(API 라우트)가 다른 Serializable
  // 라우트들과 똑같이 409로 변환해 "다시 시도" 안내를 준다.
  return prisma.$transaction(
    async (tx) => {
      const invitation = await tx.partnerInvitation.findUnique({ where: { tokenHash } });
      if (!invitation) return { ok: false, reason: "invalid" } as const;
      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        return { ok: false, reason: "email-mismatch" } as const;
      }
      if (user.adminRole) return { ok: false, reason: "admin-conflict" } as const;

      const existingActive = await tx.partnerMembership.findFirst({
        where: { userId: user.id, status: "ACTIVE" },
      });
      if (existingActive) return { ok: false, reason: "already-member" } as const;

      const claimed = await tx.partnerInvitation.updateMany({
        where: { id: invitation.id, usedAt: null, revokedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) return { ok: false, reason: "invalid" } as const;

      // PartnerMembership에는 (partnerId, userId) 유니크 제약이 있다 —
      // 예전에 이 업체 소속이었다가 해제(REVOKED)된 사람이 다시 초대되면
      // 그 행이 이미 존재하므로, 무조건 create()하면 제약 위반으로
      // 실패한다. 기존 행이 있으면 재활성화하고, 없을 때만 새로 만든다.
      const existingMembership = await tx.partnerMembership.findUnique({
        where: { partnerId_userId: { partnerId: invitation.partnerId, userId: user.id } },
      });
      if (existingMembership) {
        await tx.partnerMembership.update({
          where: { id: existingMembership.id },
          data: {
            role: invitation.role,
            status: "ACTIVE",
            invitedById: invitation.invitedById,
            invitedAt: invitation.createdAt,
            joinedAt: now,
          },
        });
      } else {
        await tx.partnerMembership.create({
          data: {
            partnerId: invitation.partnerId,
            userId: user.id,
            role: invitation.role,
            status: "ACTIVE",
            invitedById: invitation.invitedById,
            invitedAt: invitation.createdAt,
            joinedAt: now,
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: {
          memberType: "PARTNER",
          partnerId: invitation.partnerId,
          authVersion: { increment: 1 },
        },
      });

      // 같은 이메일·업체 앞으로 온 다른 미사용 초대도 함께 무효화한다.
      await tx.partnerInvitation.updateMany({
        where: {
          partnerId: invitation.partnerId,
          email: invitation.email,
          usedAt: null,
          id: { not: invitation.id },
        },
        data: { usedAt: now },
      });

      return { ok: true, partnerId: invitation.partnerId } as const;
    },
    { isolationLevel: "Serializable" },
  );
}
