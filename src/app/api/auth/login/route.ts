import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

export async function POST(request: Request) {
  // 비밀번호 대입 시도를 막기 위해 검증보다 먼저 센다.
  const limit = await checkRateLimit("login", getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `로그인 시도가 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const invalidCredentialsResponse = NextResponse.json(
    { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
    { status: 401 },
  );

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return invalidCredentialsResponse;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return invalidCredentialsResponse;

  const session = await getSession();
  session.userId = user.id;
  await session.save();

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
