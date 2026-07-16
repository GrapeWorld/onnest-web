import { Button } from "@/components/ui/Button";

export function CTASection({
  title = "확인하고 싶은 집이 있다면, 온네스트 프로젝트로 시작해보세요.",
  description = "지금은 베타 준비 단계입니다. 인수인계서 작성, 입주 프로젝트, 제휴 문의를 통해 온네스트의 초기 테스트에 참여할 수 있습니다."
}: {
  title?: string;
  description?: string;
}) {
  return (
    <section className="bg-navy px-5 py-16 text-white md:py-24">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="max-w-3xl text-3xl font-black leading-tight md:text-5xl">{title}</h2>
          <p className="mt-4 max-w-2xl text-white/70">{description}</p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:flex-col">
          <Button href="/projects/new" variant="secondary" className="shrink-0">입주 프로젝트 시작하기</Button>
          <Button href="/handovers/write" variant="ghost" className="shrink-0 border-white/15 bg-white/10 text-white hover:bg-white hover:text-forest">인수인계서 작성해보기</Button>
          <Button href="/contact" variant="ghost" className="shrink-0 border-white/15 bg-transparent text-white hover:bg-white hover:text-forest">제휴 문의하기</Button>
        </div>
      </div>
    </section>
  );
}
