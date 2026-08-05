import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { deleteProjectFiles } from "@/lib/storage";
import { isDeleteApproved } from "@/lib/oauth/deleteApproval";

// 비밀번호 회원은 password가 필수다. 소셜 전용 회원은 비밀번호가 아예
// 없으므로 이 필드를 생략하고, 대신 최근 delete-confirm 재인증 여부를
// 세션에서 확인한다(아래 본문 로직 참고).
const bodySchema = z.object({
  password: z.string().min(1).optional(),
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

  // 세션만으로 지우지 않고 한 번 더 확인한다 — 비밀번호 회원은 비밀번호,
  // 소셜 전용 회원은 최근 provider 재인증(delete-confirm) 여부로.
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

  if (record.passwordHash) {
    if (!parsed.data.password) {
      return NextResponse.json(
        { error: "비밀번호를 입력해주세요." },
        { status: 400 },
      );
    }
    const matches = await bcrypt.compare(parsed.data.password, record.passwordHash);
    if (!matches) {
      return NextResponse.json(
        { error: "비밀번호가 올바르지 않습니다." },
        { status: 403 },
      );
    }
  } else {
    // 소셜 전용 회원: 단순 로그인 세션만으로는 즉시 삭제하지 않는다.
    // /api/auth/oauth/[provider]/callback(mode=delete-confirm)이 연결된
    // provider 재인증에 성공했을 때만 짧은 시간(5분) 동안 이 값을 남긴다.
    const session = await getSession();
    if (!isDeleteApproved(session.deleteApprovedAt)) {
      return NextResponse.json(
        { error: "본인 확인이 필요합니다. 연결된 계정으로 다시 인증해주세요." },
        { status: 403 },
      );
    }
  }

  const documents = await prisma.document.findMany({
    where: { project: { userId: user.id } },
    select: { storageKey: true },
  });

  // 파일 삭제가 일부 실패해도 나머지와 계정 삭제는 계속 진행한다.
  // 남은 파일은 스토리지에 고아로 남지만, 계정 삭제를 막는 것보다 낫다.
  // (프로젝트 삭제와는 다른 정책이다 — 계정 탈퇴는 사용자가 비밀번호까지
  // 확인한 명시적 요청이라 실패에 더 관대해야 한다.)
  //
  // 실패한 storageKey는 로그에 남긴다. 계정 삭제는 아래에서 User를 지우는
  // 순간 Document 행도 cascade로 함께 사라지므로, 이 로그가 나중에 고아 파일을
  // 정리할 유일한 단서가 된다. storageKey는 개인정보나 접근 가능한 URL이
  // 아니라 Blob 안의 내부 경로일 뿐이라 로그에 남겨도 안전하다.
  const { failedCount, failedKeys } = await deleteProjectFiles(
    documents.map((doc) => doc.storageKey),
  );

  await prisma.user.delete({ where: { id: user.id } });

  const session = await getSession();
  session.destroy();

  if (failedCount > 0) {
    console.warn(
      `[delete-account] 스토리지에서 지우지 못한 파일 ${failedCount}건 (userId=${user.id}) — 재처리 대상 storageKey: ${failedKeys.join(", ")}`,
    );
  }

  return NextResponse.json({ deleted: true });
}
