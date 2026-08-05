import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";
import { normalizePhone } from "@/lib/verification";
import { escapeHtml, sendEmail } from "@/lib/email";

const findIdSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요."),
  // 휴대폰 번호를 등록하지 않고 가입한 사용자도 찾을 수 있도록 이메일도 받는다.
  contact: z.string().trim().min(1, "휴대폰 번호 또는 이메일을 입력해주세요."),
});

// 일치 여부와 무관하게 항상 같은 메시지를 돌려준다.
// 문자 대신 이메일로 보내는 이유: 온네스트는 이메일이 곧 로그인 아이디라
// 계정을 찾으면 그 이메일로 바로 안내할 수 있고, 별도 인증번호 입력 단계도 필요 없다.
const GENERIC_MESSAGE =
  "입력하신 정보와 일치하는 계정이 있다면, 가입하신 이메일로 아이디를 보내드렸습니다.";

export async function POST(request: Request) {
  const limit = await checkRateLimit("findId", getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = findIdSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { name, contact } = parsed.data;
  const isEmail = contact.includes("@");

  if (isEmail) {
    if (!z.string().email().safeParse(contact).success) {
      return NextResponse.json(
        { error: "올바른 휴대폰 번호 또는 이메일을 입력해주세요." },
        { status: 400 },
      );
    }
  } else if (!/^[0-9-]{9,13}$/.test(contact)) {
    return NextResponse.json(
      { error: "올바른 휴대폰 번호 또는 이메일을 입력해주세요." },
      { status: 400 },
    );
  }

  const matched = isEmail
    ? await findByNameAndEmail(name, contact)
    : await findByNameAndPhone(name, contact);

  if (matched) {
    const safeName = escapeHtml(matched.name);
    const safeEmail = escapeHtml(matched.email);
    await sendEmail({
      to: matched.email,
      subject: "[ONNEST] 아이디(이메일) 안내",
      html: `
        <p>안녕하세요, ${safeName}님.</p>
        <p>회원님의 온네스트 아이디(로그인 이메일)는 다음과 같습니다.</p>
        <p style="font-weight:700;font-size:16px;">${safeEmail}</p>
        <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
      `,
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}

async function findByNameAndEmail(name: string, email: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });
  return user && user.name === name ? user : null;
}

async function findByNameAndPhone(name: string, phone: string) {
  const normalizedPhone = normalizePhone(phone);
  const candidates = await prisma.user.findMany({
    where: { name, phone: { not: null } },
  });
  return (
    candidates.find(
      (candidate) =>
        candidate.phone && normalizePhone(candidate.phone) === normalizedPhone,
    ) ?? null
  );
}
