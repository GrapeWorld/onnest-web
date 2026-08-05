import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";
import { generateResetToken, hashSecret } from "@/lib/verification";
import { escapeHtml, sendEmail } from "@/lib/email";
import { buildResetPasswordUrl } from "@/lib/appUrl";

const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("올바른 이메일 형식이 아닙니다."),
});

// 가입 여부와 무관하게 항상 같은 메시지를 돌려준다.
// 응답 차이로 가입된 이메일인지 추측할 수 없게 하기 위해서다.
const GENERIC_MESSAGE =
  "입력하신 이메일로 가입된 계정이 있다면, 비밀번호 재설정 링크를 보내드렸습니다.";

export async function POST(request: Request) {
  const limit = await checkRateLimit("forgotPassword", getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });

  if (user) {
    const token = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashSecret(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    const resetUrl = buildResetPasswordUrl(token);
    const safeName = escapeHtml(user.name);
    const safeResetUrl = escapeHtml(resetUrl.toString());

    await sendEmail({
      to: user.email,
      subject: "[ONNEST] 비밀번호 재설정 안내",
      html: `
        <p>안녕하세요, ${safeName}님.</p>
        <p>아래 링크에서 새 비밀번호를 설정해주세요. 이 링크는 30분간 유효합니다.</p>
        <p><a href="${safeResetUrl}">${safeResetUrl}</a></p>
        <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      `,
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
