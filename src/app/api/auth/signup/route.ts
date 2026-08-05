import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";
import { getSession } from "@/lib/session";

const signupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
  name: z.string().trim().min(1, "이름을 입력해주세요."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9-]{9,13}$/, "올바른 휴대폰 번호를 입력해주세요.")
    .optional()
    .or(z.literal("")),
  agreeTerms: z.literal(true, { error: "약관에 동의해야 가입할 수 있습니다." }),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit("signup", getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `회원가입 시도가 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { email, password, name, phone } = parsed.data;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      // agreeTerms는 스키마에서 true만 통과하므로 여기 도달하면 동의한 것이다.
      data: {
        email,
        passwordHash,
        name,
        phone: phone || null,
        termsAgreedAt: new Date(),
      },
    });

    const session = await getSession();
    session.userId = user.id;
    session.authVersion = user.authVersion;
    await session.save();

    return NextResponse.json(
      { user: { id: user.id, email: user.email, name: user.name } },
      { status: 201 },
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "이미 가입된 이메일입니다." },
        { status: 409 },
      );
    }
    throw error;
  }
}
