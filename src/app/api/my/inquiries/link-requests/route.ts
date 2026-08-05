import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { createLinkToken } from "@/lib/inquiryLink";
import { notifyInquiryCustomer } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

const linkRequestSchema = z.object({
  inquiryId: z.string().min(1, "문의를 선택해주세요."),
});

// 비회원 문의를 계정에 연결하기 전, 이메일 소유를 다시 한번 확인하는
// 링크를 보낸다. 로그인 이메일과 문의 접수 이메일이 이미 같더라도, 그
// 시점에 실제로 그 메일함을 열 수 있는지 확인해 명시적인 연결 동의를 받는다.
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("inquiryLinkRequest", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = linkRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  // 클라이언트 힌트를 신뢰하지 않고 서버에서 다시 이메일 일치·미연결 상태를
  // 확인한다. 조건에 맞지 않으면 같은 404로 처리해 다른 사람의 문의 존재
  // 여부를 노출하지 않는다.
  const inquiry = await prisma.inquiry.findFirst({
    where: { id: parsed.data.inquiryId, email: user.email, userId: null },
    select: { id: true, email: true },
  });
  if (!inquiry) {
    return NextResponse.json({ error: "연결할 수 있는 문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const token = await createLinkToken({ inquiryId: inquiry.id, userId: user.id });
  const confirmUrl = new URL("/my/inquiries/link/confirm", getAppUrl());
  confirmUrl.searchParams.set("token", token);

  await notifyInquiryCustomer({
    to: inquiry.email,
    subject: "[ONNEST] 문의 연결 확인",
    html: `
      <p>계정에 문의를 연결하려면 아래 링크를 눌러주세요. 이 링크는 30분간 유효합니다.</p>
      <p><a href="${confirmUrl.toString()}">${confirmUrl.toString()}</a></p>
      <p>본인이 요청하지 않았다면 이 메일을 무시해주세요.</p>
    `,
  });

  return NextResponse.json({ message: "연결 확인 메일을 보냈습니다." });
}
