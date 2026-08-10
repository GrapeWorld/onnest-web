import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/app/LogoutButton";
import { MobileNav } from "@/components/layout/MobileNav";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import logoHorizontal from "../../../public/images/brand/onnest-logo-horizontal-web.png";
import logoMark from "../../../public/images/brand/onnest-mark.png";

// 처음 방문한 사용자가 훑어보기 쉽도록 3개로 좁힌다. 제외한 인수인계서·제휴
// 등은 삭제하지 않고 Footer.tsx로 진입 경로를 옮겼다.
const navItems = [
  ["서비스 소개", "/service"],
  ["입주 준비", "/move-in"],
  ["요금 안내", "/pricing"],
] as const;

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-forest/10 bg-white/70 shadow-[0_1px_20px_rgba(18,60,53,0.06)] backdrop-blur-md relative">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="ONNEST 홈" className="flex items-center">
          <Image
            src={logoHorizontal}
            alt=""
            priority
            sizes="116px"
            className="hidden h-9 w-auto sm:block"
          />
          <Image
            src={logoMark}
            alt=""
            priority
            sizes="36px"
            className="h-9 w-auto sm:hidden"
          />
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/70 md:flex">
          {navItems.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-2 py-1 hover:text-forest focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              {/* 관리자 흐름은 기존 그대로 유지 — 로그인 후 기본 행동(마이페이지·
                  로그아웃)과 별개로, 관리자에게만 보이는 추가 진입점이다. */}
              {isAdmin(user) && (
                <Link
                  href="/admin"
                  className="rounded-full bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-forest"
                >
                  관리자
                </Link>
              )}
              <Link
                href="/my"
                className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40 hover:shadow-card"
              >
                마이페이지
              </Link>
              <LogoutButton className="rounded-full px-2 py-1 text-sm font-semibold text-ink/60 hover:text-forest" />
            </>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full px-2 py-1 text-sm font-semibold text-ink/70 hover:text-forest"
              >
                로그인
              </Link>
              <Button href="/auth/signup">시작하기</Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <MobileNav
            navItems={navItems}
            isLoggedIn={Boolean(user)}
            isAdminUser={Boolean(user && isAdmin(user))}
          />
          {user ? (
            <Link
              href="/my"
              className="rounded-full border border-forest/15 px-3 py-2 text-sm font-semibold text-forest"
            >
              마이페이지
            </Link>
          ) : (
            <>
              <Link
                href="/auth/login"
                className="rounded-full border border-forest/15 px-3 py-2 text-sm font-semibold text-forest"
              >
                로그인
              </Link>
              <Link
                href="/auth/signup"
                className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-white"
              >
                시작하기
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
