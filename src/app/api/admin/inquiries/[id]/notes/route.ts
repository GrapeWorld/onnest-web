import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

const noteSchema = z.object({
  body: z.string().trim().min(1, "메모 내용을 입력해주세요.").max(2000),
});

/**
 * 문의에 남기는 내부 메모. 문의자·일반 회원에게는 노출되지 않는다.
 * NOTE_ADDED 활동으로만 저장하며, 수정·삭제 API는 의도적으로 만들지 않는다
 * — 잘못 작성한 메모는 정정 메모를 새로 추가하는 방식으로 운영한다.
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
  const parsed = noteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!inquiry) {
    return NextResponse.json(
      { error: "문의를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const activity = await prisma.inquiryActivity.create({
    data: {
      inquiryId: id,
      action: "NOTE_ADDED",
      note: parsed.data.body,
      actorId: admin.id,
      actorEmail: admin.email,
      actorName: admin.name,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
