import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { HeroMockup } from "./HeroMockup";

export function HeroSection() {
  return (
    <section className="bg-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[0.88fr_1.12fr] md:items-center md:py-24">
        <div>
          <Badge>주거 전환 플랫폼</Badge>
          <h1 className="mt-7 max-w-4xl text-[clamp(2.45rem,6.4vw,4.75rem)] font-black leading-[1.12] text-forest">
            <span className="block whitespace-nowrap">
              집도 <span className="rounded-xl bg-mint px-2 py-1">&ldquo;인수인계&rdquo;</span>가
            </span>
            <span className="block">필요합니다.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-7 text-ink/70 md:text-lg md:leading-8">
            계약부터 입주까지 온네스트 하나로.
          </p>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-ink/65 md:text-base md:leading-8">
            온네스트는 부동산 매물을 중개하지 않습니다. 이전 사용자의 인수인계 정보를 바탕으로,
            계약 전 확인부터 입주 준비까지 하나의 프로젝트로 관리합니다.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button href="/handover">인수인계서 미리보기</Button>
            <Button href="/move-in" variant="secondary">입주 프로젝트 보기</Button>
            <Button href="/contact" variant="ghost">제휴 문의하기</Button>
          </div>
        </div>

        <HeroMockup />
      </div>
    </section>
  );
}
