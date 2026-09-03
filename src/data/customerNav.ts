import { Home, Building2, FolderKanban, Wrench, Bell, type LucideIcon } from "lucide-react";

/**
 * 로그인한 고객 앱(데스크톱 사이드 레일 + 모바일 하단 내비)이 공유하는
 * 핵심 내비게이션 5항목. "전체 메뉴"는 라우트가 아니라 패널이라 이 목록에
 * 넣지 않는다(CustomerMoreMenuPanel이 별도로 정의).
 */
export type CustomerNavKey = "home" | "properties" | "projects" | "services" | "notifications";

export type CustomerNavItem = {
  key: CustomerNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

export const customerNavItems: CustomerNavItem[] = [
  { key: "home", label: "홈", href: "/my", icon: Home },
  { key: "properties", label: "매물 후보", href: "/my/candidate-properties", icon: Building2 },
  { key: "projects", label: "프로젝트", href: "/projects", icon: FolderKanban },
  { key: "services", label: "서비스", href: "/my/services", icon: Wrench },
  { key: "notifications", label: "알림", href: "/notifications", icon: Bell },
];

/**
 * 현재 경로가 이 항목의 하위 화면인지 판단한다. "홈"(/my)만 정확히 일치할
 * 때만 활성화한다 — 그렇지 않으면 /my/candidate-properties 같은 하위
 * 경로에서도 "홈"이 같이 켜져 버린다.
 */
export function isCustomerNavItemActive(item: CustomerNavItem, pathname: string) {
  if (item.href === "/my") return pathname === "/my";
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** 배지에 표시할 안 읽은 알림 개수 문구. 너무 크면 "99+"로 줄인다. */
export function formatNavBadgeCount(count: number) {
  return count > 99 ? "99+" : String(count);
}
