import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isSessionCurrent } from "@/lib/authSession";

/**
 * 쿠키 파기는 Server Action/Route Handler에서만 허용된다. getCurrentUser()는
 * Header 같은 Server Component 렌더링 중에도 호출되므로, 거기서 destroy()를
 * 그대로 부르면 예외가 던져져 페이지 전체가 500이 된다(실제로 재현 확인함).
 * 그래서 실패를 항상 삼킨다 — 쿠키가 안 지워져도 아래에서 null을 반환하므로
 * 인증 우회로 이어지지 않고, 다음 요청에서도 같은 검증을 다시 거친다.
 */
function tryDestroySession(session: { destroy: () => void }) {
  try {
    session.destroy();
  } catch {
    // no-op — 실패해도 이 함수는 항상 null을 반환하므로 안전하다.
  }
}

/**
 * React cache()로 감싸 같은 요청 안에서 layout과 각 page가 각자 호출해도
 * Prisma 조회가 한 번만 실행된다(관리자 화면에서 레이아웃의 requireAdmin()과
 * 페이지의 권한별 UI 분기가 둘 다 이 함수를 부른다).
 */
export const getCurrentUser = cache(async () => {
  const session = await getSession();
  if (!session.userId || typeof session.authVersion !== "number") {
    tryDestroySession(session);
    return null;
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!isSessionCurrent(session, user)) {
    tryDestroySession(session);
    return null;
  }

  return user;
});

/** adminRole은 role(서비스 역할)과 분리된 필드다 — null이면 관리자가 아니다. */
export function isAdmin(user: { adminRole: string | null }) {
  return user.adminRole === "super" || user.adminRole === "viewer";
}

/** 회원 상태 변경, 권한 변경 등 실제 데이터를 바꾸는 동작은 super만 가능하다. */
export function isSuperAdmin(user: { adminRole: string | null }) {
  return user.adminRole === "super";
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  // 비관리자에게는 관리자 화면의 존재를 드러내지 않고 홈으로 보낸다.
  if (!isAdmin(user)) redirect("/");
  return user;
}

export async function requireSuperAdmin() {
  const user = await requireAdmin();
  // 조회전용 관리자에게는 관리자 계정 관리 화면을 노출하지 않는다.
  if (!isSuperAdmin(user)) redirect("/admin");
  return user;
}
