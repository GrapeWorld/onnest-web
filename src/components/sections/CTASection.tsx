import Image from "next/image";
import { Button } from "@/components/ui/Button";

export function CTASection({
  title = "확인하고 싶은 집이 있다면, 온네스트 프로젝트로 시작해보세요.",
  description = "지금은 베타 준비 단계입니다. 프로젝트를 만들고 생활 정보를 기록하며 온네스트의 초기 테스트에 참여할 수 있습니다.",
  // 로그인 여부를 넘기면(주로 홈) 버튼을 상황에 맞는 것 하나로 줄인다.
  // 넘기지 않으면(다른 상세 페이지) 기존 3개 액션을 그대로 보여준다.
  isLoggedIn,
  // 로그인 상태와 무관하게 버튼 문구를 고정하고 싶을 때만 넘긴다(예: 서비스
  // 소개 페이지의 "입주 준비 시작하기"). 안 넘기면 로그인/비로그인 기본 문구를 쓴다.
  primaryLabel,
  // 비로그인 사용자에게만 "기존 회원 로그인" 보조 링크를 추가로 보여준다.
  showLoginLink = false,
}: {
  title?: string;
  description?: string;
  isLoggedIn?: boolean;
  primaryLabel?: string;
  showLoginLink?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-navy px-5 py-16 text-white md:py-24">
      <Image
        src="/images/property/busan-skyline.jpg"
        alt="도시 스카이라인 야경"
        fill
        sizes="100vw"
        className="absolute inset-0 -z-10 object-cover"
      />
      <div className="absolute inset-0 -z-10 bg-navy/85" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-navy via-navy/70 to-navy/40" />
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">{title}</h2>
          <p className="mt-4 max-w-2xl text-white/70">{description}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
          {isLoggedIn === undefined ? (
            <>
              <Button href="/projects/new" variant="secondary" className="shrink-0">입주 프로젝트 시작하기</Button>
              <Button href="/handovers/write" variant="ghost" className="shrink-0 border-white/15 bg-white/10 text-white hover:bg-white hover:text-forest">다음 이용자를 위해 생활 정보 남기기</Button>
              <Button href="/contact" variant="ghost" className="shrink-0 border-white/15 bg-transparent text-white hover:bg-white hover:text-forest">제휴 문의하기</Button>
            </>
          ) : isLoggedIn ? (
            <Button href="/my" variant="secondary" className="shrink-0">
              {primaryLabel ?? "마이페이지로 이동"}
            </Button>
          ) : (
            <>
              <Button href="/auth/signup" variant="secondary" className="shrink-0">
                {primaryLabel ?? "지금 시작하기"}
              </Button>
              {showLoginLink && (
                <a
                  href="/auth/login"
                  className="text-center text-sm font-semibold text-white/80 hover:text-white hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
                >
                  기존 회원 로그인
                </a>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
