import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";

const updateSchema = z.object({
  body: z.string().trim().min(1, "메모 내용을 입력해주세요.").max(2000),
});

// 작성자 본인이 아니어도 super면 수정할 수 있다 — 관리자 등급(super/viewer)이
// 이미 접근을 좁혀주므로 메모 작성자 단위로 추가로 좁히지 않는다.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
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

  const { noteId } = await params;
  const result = await prisma.adminMemberNote.updateMany({
    where: { id: noteId },
    data: { body: parsed.data.body },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "메모를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ id: noteId });
}
