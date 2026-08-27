import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { escapeHtml, notifyInquiryCustomer } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { createNotification } from "@/lib/notifications";
import { resolveActionItemsBySourceKey } from "@/lib/actionItems";

const messageSchema = z.object({
  body: z.string().trim().min(1, "메시지 내용을 입력해주세요.").max(2000),
});

/**
 * 관리자가 고객에게 보내는 답변. 고객·관리자 모두에게 보이는 InquiryMessage
 * 쓰레드에 쌓인다 — 내부 메모(InquiryActivity NOTE_ADDED)와는 별개다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
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
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, userId: true },
  });
  if (!inquiry) {
    return NextResponse.json({ error: "문의를 찾을 수 없습니다." }, { status: 404 });
  }

  const message = await prisma.$transaction(async (tx) => {
    const created = await tx.inquiryMessage.create({
      data: {
        inquiryId: id,
        senderRole: "ADMIN",
        body: parsed.data.body,
        senderId: admin.id,
        senderEmail: admin.email,
        senderName: admin.name,
      },
    });
    // 로그인 없이(비회원) 접수한 문의는 알림함이 없어 이메일로만 안내한다.
    if (inquiry.userId) {
      await createNotification(tx, {
        recipientUserId: inquiry.userId,
        type: "INQUIRY_ANSWERED",
        title: "문의에 답변이 등록되었습니다",
        body: "보내주신 문의에 답변이 등록됐습니다.",
        internalPath: `/my/inquiries/${id}`,
        dedupeKey: `INQUIRY_ANSWERED:${created.id}`,
      });
    }
    await resolveActionItemsBySourceKey(tx, `ADMIN_ANSWER_INQUIRY:${id}`, "COMPLETED");
    return created;
  });

  try {
    const myInquiryUrl = new URL(`/my/inquiries/${id}`, getAppUrl()).toString();
    await notifyInquiryCustomer({
      to: inquiry.email,
      subject: `[ONNEST] 문의에 답변이 등록되었습니다`,
      html: `
        <p>안녕하세요, ${escapeHtml(inquiry.name)}님.</p>
        <p>보내주신 문의에 답변이 등록됐습니다.</p>
        <p>로그인 후 마이페이지의 '내 문의'에서 확인해주세요.</p>
        <p><a href="${myInquiryUrl}">${myInquiryUrl}</a></p>
      `,
    });
  } catch (error) {
    console.error("[email] inquiry reply customer notification failed", error);
  }

  return NextResponse.json({ message }, { status: 201 });
}
