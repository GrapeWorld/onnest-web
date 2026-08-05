import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, formatRetryAfter, getClientIp } from "@/lib/rateLimit";
import { inquiryTypes, spaceTypes } from "@/data/inquiries";
import { escapeHtml, notifyAdmin, notifyInquiryCustomer } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { getCurrentUser } from "@/lib/auth";

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

  // 로그인 상태로 제출하면 그 자리에서 바로 연결한다 — 이미 인증된 세션이
  // 본인임을 증명하므로 이메일 인증 같은 추가 절차가 필요 없다(비회원 접수를
  // 나중에 연결할 때만 InquiryLinkToken으로 이메일을 확인한다).
  const currentUser = await getCurrentUser();

  // 문의 생성과 최초 CREATED 활동 기록을 하나의 트랜잭션으로 묶는다 — 공개
  // 접수는 actorId 없이 시스템 기록으로 남긴다(사용자가 임의의 actor 정보를
  // 보낼 방법 자체가 없다 — 스키마에 그런 필드가 없다).
  const inquiry = await prisma.$transaction(async (tx) => {
    const created = await tx.inquiry.create({
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
        userId: currentUser?.id ?? null,
      },
    });
    await tx.inquiryActivity.create({
      data: {
        inquiryId: created.id,
        action: "CREATED",
        snapshot: {
          name: created.name,
          email: created.email,
          phone: created.phone,
          type: created.type,
          region: created.region,
          spaceType: created.spaceType,
          message: created.message,
          organization: created.organization,
        },
      },
    });
    return created;
  });

  // 알림 발송(또는 그 URL 조립)이 실패해도 이미 저장된 문의 응답은 막지 않는다.
  try {
    const adminUrl = new URL("/admin/inquiries", getAppUrl()).toString();
    await notifyAdmin({
      subject: `[ONNEST] 신규 문의: ${escapeHtml(data.name)}`,
      html: `
        <p>새 문의가 접수됐습니다.</p>
        <ul>
          <li>이름: ${escapeHtml(data.name)}</li>
          <li>유형: ${escapeHtml(data.type)}</li>
          <li>이메일: ${escapeHtml(data.email)}</li>
          <li>연락처: ${escapeHtml(data.phone)}</li>
        </ul>
        <p><a href="${adminUrl}">관리자 페이지에서 확인하기</a></p>
      `,
    });
  } catch (error) {
    console.error("[email] inquiry admin notification failed", error);
  }

  await notifyInquiryCustomer({
    to: data.email,
    subject: "[ONNEST] 문의가 접수되었습니다",
    html: `
      <p>안녕하세요, ${escapeHtml(data.name)}님.</p>
      <p>문의가 정상적으로 접수됐습니다. 담당자 확인 후 순차적으로 답변드리겠습니다.</p>
      <p>로그인 상태로 접수하셨다면 마이페이지의 '내 문의'에서 진행 상황을 확인하실 수 있습니다.</p>
    `,
  });

  return NextResponse.json({ id: inquiry.id }, { status: 201 });
}
