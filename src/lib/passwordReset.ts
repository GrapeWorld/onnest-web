import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/verification";

export type ConsumeResetTokenResult =
  | { ok: true }
  | { ok: false; reason: "invalid" };

/**
 * 재설정 토큰을 검증과 동시에 소비한다.
 *
 * 예전 구현은 토큰을 조회해 유효성을 확인한 뒤 트랜잭션을 시작했다. 그 사이
 * 틈에 동일 토큰으로 온 동시 요청 둘 다 검증을 통과할 수 있었다.
 *
 * 실제 원자적 "점유"는 조건부 update 하나로 이뤄진다. `usedAt: null`,
 * `expiresAt: { gt: now }` 조건으로 update를 걸면, 두 요청이 동시에 같은
 * 토큰을 소비하려 해도 DB가 행 잠금으로 직렬화해준다 — 먼저 커밋된
 * 트랜잭션이 usedAt을 채우고 나면, 나중 트랜잭션은 WHERE 조건이 더 이상
 * 맞지 않아 count:0이 된다. 앞의 findUnique는 존재하지 않는 토큰을 조기에
 * 걸러내는 용도일 뿐, 원자성은 이 update 자체에서 나온다.
 */
export async function consumeResetToken({
  token,
  password,
}: {
  token: string;
  password: string;
}): Promise<ConsumeResetTokenResult> {
  const tokenHash = hashSecret(token);
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const reset = await prisma.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true },
    });
    if (!resetToken) return false;

    // 조건부 갱신으로 같은 토큰을 동시에 소비하는 요청 중 하나만 성공시킨다.
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: now },
      },
      data: { usedAt: now },
    });
    if (claimed.count !== 1) return false;

    // 비밀번호 변경과 authVersion 증가(기존 세션 전부 무효화)를
    // 같은 트랜잭션에 포함한다.
    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash, authVersion: { increment: 1 } },
    });

    // 같은 사용자의 나머지 미사용 토큰도 모두 무효화한다.
    await tx.passwordResetToken.updateMany({
      where: { userId: resetToken.userId, usedAt: null },
      data: { usedAt: now },
    });
    return true;
  });

  return reset ? { ok: true } : { ok: false, reason: "invalid" };
}
