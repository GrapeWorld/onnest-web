import Link from "next/link";
import { LogoutButton } from "@/components/app/LogoutButton";

/**
 * 데스크톱 사이드 레일의 드롭다운과 모바일 하단 내비의 전체화면 시트가
 * 공유하는 "전체 메뉴" 내용. 고객에게 접근 권한이 없는 항목(업체 포털·
 * 관리자 화면)은 아예 렌더링하지 않는다 — 숨겨진 링크로 두지 않는다.
 */
export function CustomerMoreMenuPanel({
  isPartner,
  isAdminUser,
  activeProjectId,
  onNavigate,
}: {
  isPartner: boolean;
  isAdminUser: boolean;
  /** 문서함은 프로젝트에 종속된 화면이라 전역 목록이 없다 — 진행 중인 프로젝트가 있을 때만 그 문서함으로 연결한다. */
  activeProjectId: string | null;
  onNavigate?: () => void;
}) {
  const items: { label: string; href: string }[] = [
    { label: "서비스 신청·견적 확인", href: "/my/services" },
    { label: "문의", href: "/my/inquiries" },
    ...(activeProjectId ? [{ label: "문서함", href: `/projects/${activeProjectId}/documents` }] : []),
    { label: "계정 및 로그인 관리", href: "/my" },
  ];

  return (
    <div className="grid gap-1">
      <nav aria-label="전체 메뉴" className="grid gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-ink/70 hover:bg-cream hover:text-forest"
          >
            {item.label}
          </Link>
        ))}
        {isPartner && (
          <Link
            href="/partner"
            onClick={onNavigate}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-forest hover:bg-cream"
          >
            업체 포털로 이동
          </Link>
        )}
        {isAdminUser && (
          <Link
            href="/admin"
            onClick={onNavigate}
            className="rounded-xl px-3 py-2.5 text-sm font-semibold text-navy hover:bg-cream"
          >
            관리자 화면으로 이동
          </Link>
        )}
      </nav>
      <div className="mt-2 border-t border-forest/10 pt-2">
        <LogoutButton className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-ink/50 hover:bg-cream hover:text-forest" />
      </div>
    </div>
  );
}
