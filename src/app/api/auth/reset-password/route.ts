import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";
import { consumeResetToken } from "@/lib/passwordReset";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "유효하지 않은 링크입니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit("resetPassword", getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const result = await consumeResetToken(parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: "링크가 만료되었거나 이미 사용되었습니다. 다시 요청해주세요." },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해주세요.",
  });
}
