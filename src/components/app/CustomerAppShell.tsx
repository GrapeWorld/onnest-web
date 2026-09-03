import { AppShell } from "@/components/app/AppShell";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { projectSteps } from "@/data/projectSteps";

/**
 * 로그인한 고객 화면(마이페이지·매물 후보·프로젝트·서비스·알림 등)
 * 전용 진입점. 사이드 레일·하단 내비에 필요한 데이터를 여기서 서버
 * 컴포넌트로 조회한 뒤 순수 프레젠테이션 컴포넌트인 AppShell에 넘긴다 —
 * AppShell 자체는 error.tsx("use client")에서도 쓰이므로 서버 전용
 * 모듈을 직접 import하면 안 된다. 파트너·관리자·공개 페이지는 이 컴포넌트
 * 대신 AppShell을 그대로 쓴다.
 *
 * getCurrentUser는 React cache로 감싸져 있어, 페이지가 이미 호출했어도
 * 여기서 다시 불러도 요청당 한 번만 실제로 조회한다. 배지·역할 조회가
 * 실패해도 화면 자체는 깨지면 안 되므로(Header.tsx와 같은 원칙) 실패 시
 * 안전한 기본값(0, false, null)으로 돌아간다.
 */
export async function CustomerAppShell({
  title,
  description,
  contentClassName,
  children,
}: {
  title: string;
  description: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  let customerNavData = null;
  if (user) {
    const isPartner = user.memberType === "PARTNER";
    const isAdminUser = isAdmin(user);
    let unreadCount = 0;
    let activeProjectId: string | null = null;
    try {
      const [count, projects] = await Promise.all([
        prisma.notification.count({ where: { recipientUserId: user.id, readAt: null } }),
        prisma.project.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, stepStates: { select: { status: true } } },
        }),
      ]);
      unreadCount = count;
      activeProjectId =
        projects.find(
          (project) => project.stepStates.filter((s) => s.status === "완료").length < projectSteps.length,
        )?.id ?? projects[0]?.id ?? null;
    } catch (error) {
      console.error("[customer-nav] failed to load nav data", error);
    }
    customerNavData = { isPartner, isAdminUser, unreadCount, activeProjectId };
  }

  return (
    <AppShell
      title={title}
      description={description}
      contentClassName={contentClassName}
      customerNavData={customerNavData}
    >
      {children}
    </AppShell>
  );
}
