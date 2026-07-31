import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { inquiryStatuses } from "@/data/inquiries";

const updateSchema = z.object({
  status: z.enum(inquiryStatuses).optional(),
  owner: z.string().trim().max(50).optional(),
  nextAction: z.string().trim().max(200).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const inquiry = await prisma.inquiry.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json({ inquiry });
}
