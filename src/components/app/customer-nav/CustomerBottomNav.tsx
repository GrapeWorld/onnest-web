"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { customerNavItems, isCustomerNavItemActive, formatNavBadgeCount } from "@/data/customerNav";
import { CustomerMoreMenuPanel } from "./CustomerMoreMenuPanel";

// 하단 탭은 자리가 좁아 "서비스"는 빼고 전체 메뉴에서 접근한다(스펙 6번
// 섹션의 권장 항목 — 데스크톱 레일과 의도적으로 다르다).
const bottomTabKeys = ["home", "properties", "projects", "notifications"] as const;
const bottomTabItems = customerNavItems.filter((item) =>
  (bottomTabKeys as readonly string[]).includes(item.key),
);

/** 1024px 미만에서만 보이는 고정 하단 내비. iPhone 홈 인디케이터 영역을 피한다. */
export function CustomerBottomNav({
  unreadCount,
  isPartner,
  isAdminUser,
  activeProjectId,
}: {
  unreadCount: number;
  isPartner: boolean;
  isAdminUser: boolean;
  activeProjectId: string | null;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <nav
        aria-label="고객 메뉴"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-forest/10 bg-white/95 backdrop-blur lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="grid grid-cols-5">
          {bottomTabItems.map((item) => {
            const active = isCustomerNavItemActive(item, pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.key}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80",
                  active ? "text-forest" : "text-ink/50",
                )}
              >
                <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.25} />
                <span className="truncate px-0.5">{item.label}</span>
                {item.key === "notifications" && unreadCount > 0 && (
                  <span className="absolute right-[22%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest px-1 text-[10px] font-bold text-white">
                    {formatNavBadgeCount(unreadCount)}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
            className="flex min-h-11 flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-semibold text-ink/50 focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
          >
            <Menu className="h-5 w-5" aria-hidden="true" strokeWidth={2.25} />
            메뉴
          </button>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="전체 메뉴">
          <button
            type="button"
            aria-label="메뉴 닫기"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-ink/40"
          />
          <div
            className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-[24px] bg-white p-4 shadow-card"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 1rem)" }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-base font-black text-forest">전체 메뉴</p>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="메뉴 닫기"
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink/50 hover:bg-cream"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <CustomerMoreMenuPanel
              isPartner={isPartner}
              isAdminUser={isAdminUser}
              activeProjectId={activeProjectId}
              onNavigate={() => setMenuOpen(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
