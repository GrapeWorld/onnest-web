import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCurrentUser } from "@/lib/auth";

/**
 * 첫 화면은 "무엇을 해야 하는지"만 스크롤 없이 보여준다. 소개용 목업·부가
 * 설명은 의도적으로 뺐다 — 자세한 내용은 로그인/회원가입 이후나 각 상세
 * 페이지(서비스 소개·입주 준비)에서 확인하도록 유도한다.
 */
export async function HeroSection() {
  const user = await getCurrentUser();

  return (
    <section className="bg-cream">
      <div className="mx-auto max-w-2xl px-5 py-16 text-center md:py-24">
        <Badge>주거 전환 플랫폼</Badge>
        <h1 className="mt-6 text-[clamp(2.1rem,6vw,3.4rem)] font-black leading-[1.15] text-forest">
          입주를 앞두고 계신가요?
        </h1>
        <p className="mt-5 text-base leading-7 text-ink/70 md:text-lg md:leading-8">
          복잡한 입주 준비를 프로젝트로 만들고, 필요한 일정과 서비스를 한곳에서
          관리하세요.
        </p>
        <div className="mt-9 flex flex-col items-center gap-3">
          {user ? (
            <Button href="/my" className="w-full sm:w-auto sm:px-10">
              내 입주 준비 보기
            </Button>
          ) : (
            <>
              <Button href="/auth/signup" className="w-full sm:w-auto sm:px-10">
                입주 준비 시작하기
              </Button>
              <Link
                href="/auth/login"
                className="text-sm font-semibold text-forest hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
              >
                기존 회원 로그인
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
