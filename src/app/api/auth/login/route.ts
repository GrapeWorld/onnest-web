import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";
import { loginBlockedStatuses } from "@/data/memberStatus";

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

  // IP 제한과 별개로 계정 단위로도 센다. 공격자가 IP를 바꿔가며 시도해도
  // 특정 계정에 대한 총 시도 횟수는 이 한도를 넘지 못한다.
  const emailLimit = await checkRateLimit("loginEmail", email);
  if (!emailLimit.ok) {
    return NextResponse.json(
      {
        error: `로그인 시도가 너무 많습니다. ${formatRetryAfter(emailLimit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const invalidCredentialsResponse = NextResponse.json(
    { error: "이메일 또는 비밀번호가 올바르지 않습니다." },
    { status: 401 },
  );

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return invalidCredentialsResponse;

  // 소셜 전용 회원은 passwordHash가 없다 — bcrypt.compare(password, null)은
  // 예외를 던지므로 아예 호출하지 않고, 외부에는 일반 로그인 실패와 같은
  // 문구만 돌려준다(소셜 전용 계정이라는 사실을 노출하지 않는다).
  if (!user.passwordHash) return invalidCredentialsResponse;

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) return invalidCredentialsResponse;

  // 비밀번호가 맞아도 정지·탈퇴·제한 계정이면 로그인을 막는다. 계정 상태를
  // 외부에 알려주지 않기 위해 비밀번호가 틀렸을 때와 같은 일반 오류만
  // 돌려준다 — "정지된 계정입니다" 같은 구체적 사유는 로그인 응답에 넣지
  // 않는다.
  if (loginBlockedStatuses.includes(user.status as (typeof loginBlockedStatuses)[number])) {
    return invalidCredentialsResponse;
  }

  const session = await getSession();
  session.userId = user.id;
  session.authVersion = user.authVersion;
  await session.save();

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  return NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name },
  });
}
