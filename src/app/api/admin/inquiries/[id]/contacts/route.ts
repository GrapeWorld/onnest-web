import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { contactMethods } from "@/data/inquiryActivity";

const contactSchema = z.object({
  method: z.enum(contactMethods, { error: "연락 방식을 선택해주세요." }),
  result: z.string().trim().min(1, "연락 결과를 입력해주세요.").max(500),
  contactedAt: z
    .string()
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "연락 시각을 확인해주세요.",
    }),
  followUp: z.string().trim().max(500).optional().or(z.literal("")),
});

/**
 * 문의자와의 연락 기록. 원문 문의 내용(Inquiry.message 등)은 건드리지 않고
 * CONTACT_LOGGED 활동으로만 남긴다.
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
  const parsed = contactSchema.safeParse(body);
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

  const { method, result, contactedAt, followUp } = parsed.data;
  const activity = await prisma.inquiryActivity.create({
    data: {
      inquiryId: id,
      action: "CONTACT_LOGGED",
      changes: {
        method,
        result,
        contactedAt: new Date(contactedAt).toISOString(),
        followUp: followUp || null,
      },
      actorId: admin.id,
      actorEmail: admin.email,
      actorName: admin.name,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
}
