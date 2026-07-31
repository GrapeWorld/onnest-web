import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/app/LogoutButton";
import { getCurrentUser } from "@/lib/auth";
import logoHorizontal from "../../../public/images/brand/onnest-logo-horizontal-web.png";
import logoMark from "../../../public/images/brand/onnest-mark.png";

const navItems = [
  ["서비스", "/service"],
  ["인수인계서", "/handover"],
  ["입주 프로젝트", "/move-in"],
  ["요금제", "/pricing"],
  ["제휴", "/partners"],
];

export async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-50 border-b border-forest/10 bg-white/70 shadow-[0_1px_20px_rgba(18,60,53,0.06)] backdrop-blur-md">
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
              {user.role === "admin" && (
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
                {user.name}님
              </Link>
              <LogoutButton className="rounded-full px-2 py-1 text-sm font-semibold text-ink/60 hover:text-forest" />
            </>
          ) : (
            <Link
              href="/auth/login"
              className="rounded-full px-2 py-1 text-sm font-semibold text-ink/70 hover:text-forest"
            >
              로그인
            </Link>
          )}
          <Button href={user ? "/contact" : "/auth/signup"}>
            {user ? "문의하기" : "회원가입"}
          </Button>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <Link
            href={user ? "/my" : "/auth/login"}
            className="rounded-full border border-forest/15 px-3 py-2 text-sm font-semibold text-forest"
          >
            {user ? user.name : "로그인"}
          </Link>
          <Link
            href="/contact"
            className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-white"
          >
            문의
          </Link>
        </div>
      </div>
    </header>
  );
}
