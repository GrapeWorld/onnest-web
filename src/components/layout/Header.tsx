import Link from "next/link";
import { Button } from "@/components/ui/Button";

const navItems = [
  ["서비스", "/service"],
  ["인수인계서", "/handover"],
  ["입주 프로젝트", "/move-in"],
  ["요금제", "/pricing"],
  ["제휴", "/partners"]
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-forest/10 bg-white/70 shadow-[0_1px_20px_rgba(18,60,53,0.06)] backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="text-xl font-black text-forest">
          ONNEST
        </Link>
        <nav className="hidden items-center gap-6 text-sm font-semibold text-ink/70 md:flex">
          {navItems.map(([label, href]) => (
            <Link key={href} href={href} className="rounded-full px-2 py-1 hover:text-forest focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80">
              {label}
            </Link>
          ))}
        </nav>
        <Button href="/contact" className="hidden md:inline-flex">문의하기</Button>
        <Link href="/contact" className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-white md:hidden">
          문의
        </Link>
      </div>
    </header>
  );
}
