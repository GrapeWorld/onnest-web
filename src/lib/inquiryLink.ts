import { prisma } from "@/lib/prisma";
import { generateResetToken, hashSecret } from "@/lib/verification";

// 비밀번호 재설정 링크와 같은 유효기간을 쓴다(src/app/api/auth/forgot-password/route.ts).
const LINK_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function createLinkToken({
  inquiryId,
  userId,
}: {
  inquiryId: string;
  userId: string;
}) {
  const token = generateResetToken();
  await prisma.inquiryLinkToken.create({
    data: {
      inquiryId,
      userId,
      tokenHash: hashSecret(token),
      expiresAt: new Date(Date.now() + LINK_TOKEN_TTL_MS),
    },
  });
  return token;
}

export type ConsumeLinkTokenResult =
  | { ok: true; inquiryId: string }
  | { ok: false; reason: "invalid" };

/**
 * 토큰을 검증과 동시에 소비한다. consumeResetToken(src/lib/passwordReset.ts)과
 * 완전히 같은 원자적 소비 원칙 — 조건부 updateMany 하나로 동시 소비 경쟁을
 * 막는다. 로그인 세션의 userId가 토큰 발급 대상과 다르면 즉시 거부한다.
 */
export async function consumeLinkToken({
  token,
  userId,
}: {
  token: string;
  userId: string;
}): Promise<ConsumeLinkTokenResult> {
  const tokenHash = hashSecret(token);
  const now = new Date();

  const inquiryId = await prisma.$transaction(async (tx) => {
    const linkToken = await tx.inquiryLinkToken.findUnique({
      where: { tokenHash },
      select: { id: true, inquiryId: true, userId: true },
    });
    if (!linkToken || linkToken.userId !== userId) return null;

    const claimed = await tx.inquiryLinkToken.updateMany({
      where: { id: linkToken.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return null;

    // 이 시점까지 다른 방식으로 이미 연결되지 않았을 때만 연결한다.
    const linked = await tx.inquiry.updateMany({
      where: { id: linkToken.inquiryId, userId: null },
      data: { userId },
    });
    if (linked.count !== 1) return null;

    // 같은 문의에 대해 남아있는 다른 미사용 토큰도 함께 무효화한다.
    await tx.inquiryLinkToken.updateMany({
      where: { inquiryId: linkToken.inquiryId, usedAt: null },
      data: { usedAt: now },
    });

    return linkToken.inquiryId;
  });

  return inquiryId ? { ok: true, inquiryId } : { ok: false, reason: "invalid" };
}
