import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

const createSchema = z.object({
  body: z.string().trim().min(1, "메모 내용을 입력해주세요.").max(2000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "회원을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const note = await prisma.adminMemberNote.create({
    data: {
      userId: id,
      authorId: admin.id,
      authorEmail: admin.email,
      body: parsed.data.body,
    },
    select: { id: true, body: true, authorEmail: true, createdAt: true },
  });

  return NextResponse.json({ note }, { status: 201 });
}
