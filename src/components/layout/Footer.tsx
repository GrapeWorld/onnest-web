import Link from "next/link";

const links = [
  ["운영 원칙", "/policy/safety"],
  ["인수인계서 정책", "/policy/handover"],
  ["개인정보처리방침", "/privacy"],
  ["이용약관", "/terms"],
  ["문의", "/contact"]
];

export function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="text-2xl font-black">ONNEST</p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/70">
            온네스트는 부동산 계약을 중개하지 않고, 집·사무실·공장 같은 공간의 실제 사용 경험을 인수인계하며 입주와 이전 준비 과정을 관리하는 공간 전환 플랫폼입니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-white/75">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-white">
              {label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">
        © 2026 주식회사 온네스트. All rights reserved.
      </div>
    </footer>
  );
}
