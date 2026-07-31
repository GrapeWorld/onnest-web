import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";
import { inquiryTypes, spaceTypes } from "@/data/inquiries";

const inquirySchema = z.object({
  name: z.string().trim().min(1, "이름을 입력해주세요.").max(50),
  organization: z.string().trim().max(100).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("올바른 이메일 형식이 아닙니다."),
  phone: z
    .string()
    .trim()
    .regex(/^[0-9-]{9,13}$/, "올바른 연락처를 입력해주세요."),
  type: z.enum(inquiryTypes as [string, ...string[]], {
    error: "문의 유형을 선택해주세요.",
  }),
  region: z.string().trim().max(100).optional().or(z.literal("")),
  spaceType: z
    .enum(spaceTypes as [string, ...string[]])
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .trim()
    .min(10, "문의 내용을 10자 이상 입력해주세요.")
    .max(2000),
  agreePrivacy: z.literal(true, {
    error: "개인정보 수집 및 이용에 동의해야 문의를 보낼 수 있습니다.",
  }),
});

export async function POST(request: Request) {
  const limit = await checkRateLimit("inquiry", getClientIp(request));
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `문의 접수가 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = inquirySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const inquiry = await prisma.inquiry.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      type: data.type,
      message: data.message,
      organization: data.organization || null,
      region: data.region || null,
      spaceType: data.spaceType || null,
      privacyAgreedAt: new Date(),
    },
  });

  return NextResponse.json({ id: inquiry.id }, { status: 201 });
}
