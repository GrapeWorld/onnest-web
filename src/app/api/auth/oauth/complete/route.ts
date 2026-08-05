import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOAuthSession } from "@/lib/oauth/session";
import { getSession } from "@/lib/session";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

const completeSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(50),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9-]{9,13}$/, "올바른 휴대폰 번호를 입력해주세요.")
    .optional()
    .or(z.literal("")),
  agreeTerms: z.literal(true, { error: "약관에 동의해야 가입할 수 있습니다." }),
});

/** OAuth 신규 가입 완료. User+SocialAccount 생성은 하나의 트랜잭션으로 처리한다. */
export async function POST(request: Request) {
  const limit = await checkRateLimit("oauthSignupComplete", getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const oauthSession = await getOAuthSession();
  const profile = oauthSession.pendingProfile;
  // provider가 검증한 이메일이 없는 프로필은 애초에 여기까지 오지 않는다
  // (callback에서 이미 걸러진다) — 세션이 만료·위조됐을 가능성만 남는다.
  if (!profile || !profile.email) {
    return NextResponse.json(
      { error: "세션이 만료되었습니다. 처음부터 다시 시도해주세요." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { name, phone } = parsed.data;
  const email = profile.email;

  try {
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          name,
          phone: phone || null,
          termsAgreedAt: new Date(),
        },
      });
      await tx.socialAccount.create({
        data: {
          userId: created.id,
          provider: profile.provider,
          providerAccountId: profile.providerAccountId,
          providerEmail: profile.email,
          emailVerified: profile.emailVerified,
        },
      });
      return created;
    });

    await oauthSession.destroy();

    const realSession = await getSession();
    realSession.userId = user.id;
    realSession.authVersion = user.authVersion;
    await realSession.save();

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
