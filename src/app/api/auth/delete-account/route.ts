import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { deleteProjectFile } from "@/lib/storage";

const bodySchema = z.object({
  password: z.string().min(1, "비밀번호를 입력해주세요."),
});

/**
 * 회원 탈퇴.
 *
 * User를 지우면 프로젝트·단계·일정·서비스 신청·인수인계서·문서 기록은
 * 스키마의 onDelete: Cascade로 함께 지워진다. 다만 스토리지에 올라간 파일은
 * DB 밖에 있으므로 여기서 직접 지운다.
 *
 * 문의(Inquiry)는 계정과 연결돼 있지 않은 별도 접수 기록이라 남는다.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  // 세션만으로 지우지 않고 비밀번호를 한 번 더 확인한다.
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const matches = await bcrypt.compare(
    parsed.data.password,
    record.passwordHash,
  );
  if (!matches) {
    return NextResponse.json(
      { error: "비밀번호가 올바르지 않습니다." },
      { status: 403 },
    );
  }

  const documents = await prisma.document.findMany({
    where: { project: { userId: user.id } },
    select: { storageKey: true },
  });

  // 파일 삭제가 하나 실패해도 나머지와 계정 삭제는 계속 진행한다.
  // 남은 파일은 스토리지에 고아로 남지만, 계정 삭제를 막는 것보다 낫다.
  const orphanedKeys: string[] = [];
  for (const doc of documents) {
    try {
      await deleteProjectFile(doc.storageKey);
    } catch {
      orphanedKeys.push(doc.storageKey);
    }
  }

  await prisma.user.delete({ where: { id: user.id } });

  const session = await getSession();
  session.destroy();

  if (orphanedKeys.length > 0) {
    console.warn(
      `[delete-account] 스토리지에서 지우지 못한 파일 ${orphanedKeys.length}건`,
      orphanedKeys,
    );
  }

  return NextResponse.json({ deleted: true });
}
