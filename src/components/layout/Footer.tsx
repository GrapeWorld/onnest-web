import Link from "next/link";

// 헤더 상단 메뉴에서는 뺐지만 삭제하지 않은 페이지들의 진입 경로. 서비스
// 흐름에 맞춘 순서 — "제휴 문의"(파트너 대상 안내)와 "고객 문의"(일반 문의
// 접수 폼)는 서로 다른 페이지라 이름으로 목적이 구분되게 남겨둔다.
const links = [
  ["생활 정보 기록", "/handover"],
  ["운영 원칙", "/policy/safety"],
  ["인수인계서 정책", "/policy/handover"],
  ["제휴 문의", "/partners"],
  ["고객 문의", "/contact"],
  ["개인정보처리방침", "/privacy"],
  ["이용약관", "/terms"],
];

export function Footer() {
  return (
    <footer className="bg-forest text-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,auto)]">
        <div className="min-w-0">
          <p className="text-2xl font-black">ONNEST</p>
          <p className="mt-4 max-w-xl text-sm leading-7 text-white/70">
            온네스트는 부동산 계약을 중개하지 않고, 집·사무실·공장 같은 공간의 실제 사용 경험을 기록으로 남기며 입주와 이전 준비 과정을 관리하는 공간 전환 플랫폼입니다.
          </p>
        </div>
        <nav aria-label="푸터 메뉴" className="min-w-0">
          <div className="flex flex-wrap justify-start gap-x-5 gap-y-3 text-sm text-white/75 lg:justify-end">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="inline-block whitespace-nowrap rounded-sm py-1 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint"
              >
                {label}
              </Link>
            ))}
          </div>
        </nav>
      </div>
      <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-white/50">
        © 2026 온네스트. All rights reserved.
      </div>
    </footer>
  );
}
