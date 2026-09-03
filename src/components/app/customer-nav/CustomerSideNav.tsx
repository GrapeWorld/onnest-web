"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu } from "lucide-react";
import { cn } from "@/lib/cn";
import { customerNavItems, isCustomerNavItemActive, formatNavBadgeCount } from "@/data/customerNav";
import { CustomerMoreMenuPanel } from "./CustomerMoreMenuPanel";

/** 1024px 이상에서만 보이는 고객 전용 좌측 사이드 레일. */
export function CustomerSideNav({
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
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav
      aria-label="고객 메뉴"
      className="sticky top-20 hidden max-h-[calc(100vh-6rem)] w-20 shrink-0 flex-col items-center gap-1 self-start overflow-y-auto rounded-[24px] border border-forest/10 bg-white py-4 lg:flex"
    >
      {customerNavItems.map((item) => {
        const active = isCustomerNavItemActive(item, pathname);
        const Icon = item.icon;
        return (
          <Link
            key={item.key}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-center text-[11px] font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80",
              active ? "bg-mint text-forest" : "text-ink/55 hover:bg-cream hover:text-forest",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" strokeWidth={2.25} />
            {item.label}
            {item.key === "notifications" && unreadCount > 0 && (
              <span className="absolute right-1.5 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-forest px-1 text-[10px] font-bold text-white">
                {formatNavBadgeCount(unreadCount)}
              </span>
            )}
          </Link>
        );
      })}

      <div className="relative mt-1">
        <button
          type="button"
          onClick={() => setMoreOpen((value) => !value)}
          aria-expanded={moreOpen}
          aria-haspopup="true"
          aria-label="전체 메뉴"
          className={cn(
            "flex w-16 flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-semibold focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80",
            moreOpen ? "bg-mint text-forest" : "text-ink/55 hover:bg-cream hover:text-forest",
          )}
        >
          <Menu className="h-5 w-5" aria-hidden="true" strokeWidth={2.25} />
          전체 메뉴
        </button>
        {moreOpen && (
          <>
            {/* 바깥 클릭으로 닫히게 하는 투명 오버레이. 패널 자체보다 z가 낮다. */}
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-30 cursor-default"
            />
            <div className="absolute left-full top-0 z-40 ml-2 w-64 rounded-2xl border border-forest/10 bg-white p-2 shadow-card">
              <CustomerMoreMenuPanel
                isPartner={isPartner}
                isAdminUser={isAdminUser}
                activeProjectId={activeProjectId}
                onNavigate={() => setMoreOpen(false)}
              />
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
