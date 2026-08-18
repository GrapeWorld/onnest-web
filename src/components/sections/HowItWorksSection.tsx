import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Card } from "@/components/ui/Card";

export type HowItWorksStep = {
  step: string;
  title: string;
  description: string;
};

const defaultSteps: HowItWorksStep[] = [
  {
    step: "1",
    title: "프로젝트 만들기",
    description: "이사·이전할 공간의 정보를 입력해 나만의 입주 프로젝트를 시작합니다.",
  },
  {
    step: "2",
    title: "일정과 서비스 연결하기",
    description: "계약·입주 일정을 등록하고, 필요한 이사·청소·설치 서비스를 신청합니다.",
  },
  {
    step: "3",
    title: "생활 정보 기록·확인하기",
    description: "입주 전 확인 사항을 살펴보고, 다음 이용자를 위한 기록도 남깁니다.",
  },
];

export function HowItWorksSection({
  id,
  steps = defaultSteps,
  footerLink,
}: {
  /** 앵커 링크 대상으로 쓸 때만 넘긴다(예: 서비스 소개 페이지의 "이용 방법 보기"). */
  id?: string;
  steps?: HowItWorksStep[];
  footerLink?: { href: string; label: string };
}) {
  return (
    <Section id={id} className={id ? "scroll-mt-24 bg-cream/60" : "bg-cream/60"}>
      <SectionTitle eyebrow="How it works" title="이용 방법은 세 단계입니다." align="center" />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {steps.map((item) => (
          <Card key={item.step}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
              {item.step}
            </span>
            <h3 className="mt-4 text-lg font-bold text-forest">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-ink/70">{item.description}</p>
          </Card>
        ))}
      </div>
      {footerLink && (
        <div className="mt-8 text-center">
          <Link
            href={footerLink.href}
            className="inline-flex text-sm font-semibold text-forest hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
          >
            {footerLink.label} →
          </Link>
        </div>
      )}
    </Section>
  );
}
