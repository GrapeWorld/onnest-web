"use client";

import { useState } from "react";
import Link from "next/link";
import { LogoutButton } from "@/components/app/LogoutButton";

type NavItem = readonly [string, string];

export function MobileNav({
  navItems,
  isLoggedIn,
  isAdminUser,
}: {
  navItems: readonly NavItem[];
  isLoggedIn: boolean;
  isAdminUser: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "메뉴 닫기" : "메뉴 열기"}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-forest/15 text-forest"
      >
        {open ? (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <div
          id="mobile-nav-panel"
          className="absolute inset-x-0 top-full border-b border-forest/10 bg-white px-5 py-4 shadow-card"
        >
          <nav className="flex flex-col gap-1 text-sm font-semibold text-ink/70">
            {navItems.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2 hover:bg-cream hover:text-forest"
              >
                {label}
              </Link>
            ))}
          </nav>
          {(isAdminUser || isLoggedIn) && (
            <div className="mt-3 flex flex-col gap-1 border-t border-forest/10 pt-3 text-sm font-semibold">
              {isAdminUser && (
                <Link
                  href="/admin"
                  onClick={() => setOpen(false)}
                  className="rounded-xl px-3 py-2 text-navy hover:bg-cream"
                >
                  관리자
                </Link>
              )}
              {isLoggedIn && (
                <LogoutButton className="rounded-xl px-3 py-2 text-left text-ink/60 hover:bg-cream hover:text-forest" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
