import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { escapeHtml, notifyAdmin } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";

const messageSchema = z.object({
  body: z.string().trim().min(1, "메시지 내용을 입력해주세요.").max(2000),
});

/** 고객이 본인 문의에 추가 질문·메시지를 남긴다. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("inquiryMessage", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.`,
      },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  // 본인 소유가 아니거나 존재하지 않는 문의는 같은 404로 처리해 존재 여부를
  // 노출하지 않는다(F2/파트너 포털과 동일 원칙).
  const inquiry = await prisma.inquiry.findFirst({
    where: { id, userId: user.id },
    select: { id: true, name: true },
  });
  if (!inquiry) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const message = await prisma.inquiryMessage.create({
    data: {
      inquiryId: id,
      senderRole: "CUSTOMER",
      body: parsed.data.body,
      senderId: user.id,
      senderEmail: user.email,
      senderName: user.name,
    },
  });

  try {
    const adminUrl = new URL(`/admin/inquiries/${id}`, getAppUrl()).toString();
    await notifyAdmin({
      subject: `[ONNEST] 문의에 새 메시지: ${escapeHtml(inquiry.name)}`,
      html: `
        <p>고객이 문의에 새 메시지를 남겼습니다.</p>
        <p><a href="${adminUrl}">관리자 페이지에서 확인하기</a></p>
      `,
    });
  } catch (error) {
    console.error("[email] inquiry message admin notification failed", error);
  }

  return NextResponse.json({ message }, { status: 201 });
}
