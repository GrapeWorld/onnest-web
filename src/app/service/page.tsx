import Link from "next/link";
import { CalendarCheck, Link2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CTASection } from "@/components/sections/CTASection";
import { CoreFeaturesSection, type CoreFeatureItem } from "@/components/sections/CoreFeaturesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { ServiceConnectionGrid } from "@/components/sections/ServiceConnectionGrid";
import { HandoverFlowMockup } from "@/components/sections/NativeMockups";
import { getCurrentUser } from "@/lib/auth";

const serviceFeatures: CoreFeatureItem[] = [
  {
    title: "준비 일정 관리",
    description: "계약, 이사, 설치 일정을 프로젝트 하나에서 관리하세요.",
    icon: CalendarCheck,
    href: "/move-in",
    linkLabel: "자세히 보기",
  },
  {
    title: "필요한 서비스 연결",
    description: "이사·청소·인터넷 등 필요한 서비스를 알맞은 시점에 신청하세요.",
    icon: Link2,
  },
  {
    title: "생활 정보 기록·확인",
    description: "채광, 결로, 주차처럼 미리 알아두면 좋은 정보를 확인하고 남기세요.",
    icon: NotebookPen,
    href: "/handover",
    linkLabel: "자세히 보기",
  },
];

const serviceSteps = [
  {
    step: "1",
    title: "프로젝트 만들기",
    description: "준비 중인 집·사무실·공장을 프로젝트로 등록합니다.",
  },
  {
    step: "2",
    title: "일정과 서비스 관리하기",
    description: "해야 할 일을 확인하고 필요한 서비스를 신청합니다.",
  },
  {
    step: "3",
    title: "진행 상황과 정보를 한곳에서 확인하기",
    description: "일정, 신청 상태, 받은 견적과 생활 정보를 계속 확인합니다.",
  },
];

const trustPrinciples = [
  "부동산 계약을 중개하거나 공간의 안전성을 직접 판정하지 않습니다.",
  "제휴 관계와 비용 정보를 명확하게 안내합니다.",
  "개인정보와 생활 정보는 접근 권한에 따라 보호합니다.",
];

export default async function ServicePage() {
  const user = await getCurrentUser();

  return (
    <main>
      <section className="bg-cream px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <Badge>Service</Badge>
            <h1 className="mt-4 break-keep text-balance text-[clamp(2.1rem,5vw,3.4rem)] font-black leading-[1.15] text-forest">
              입주 준비, 어디서부터 시작해야 할지 막막하다면
            </h1>
            <p className="mt-5 max-w-xl text-base leading-7 text-ink/70 md:text-lg md:leading-8">
              일정 관리부터 필요한 서비스 연결까지 하나의 프로젝트로 관리하세요.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href={user ? "/my" : "/auth/signup"}>입주 준비 시작하기</Button>
              <Button href="#how-it-works" variant="ghost">
                이용 방법 보기
              </Button>
            </div>
          </div>
          <HandoverFlowMockup />
        </div>
      </section>

      <CoreFeaturesSection
        title="온네스트에서 할 수 있는 일"
        items={serviceFeatures}
      />

      <HowItWorksSection
        id="how-it-works"
        steps={serviceSteps}
        footerLink={{ href: "/move-in", label: "입주 준비 전체 단계 보기" }}
      />

      <ServiceConnectionGrid />

      <section className="bg-cream/60 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="break-keep text-balance text-2xl font-bold text-forest md:text-3xl">
            믿고 이용할 수 있도록
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {trustPrinciples.map((principle) => (
              <p
                key={principle}
                className="rounded-2xl border border-forest/10 bg-white px-5 py-5 text-sm leading-6 text-ink/70"
              >
                {principle}
              </p>
            ))}
          </div>
          <Link
            href="/policy/safety"
            className="mt-6 inline-flex text-sm font-semibold text-forest hover:underline focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80"
          >
            운영 원칙 자세히 보기 →
          </Link>
        </div>
      </section>

      <CTASection
        title={user ? "지금 바로 이어서 준비하세요." : "지금 바로 입주 준비를 시작해보세요."}
        description={
          user
            ? "마이페이지에서 진행 중인 프로젝트와 다음 할 일을 확인할 수 있습니다."
            : "몇 가지 정보만 입력하면 프로젝트를 만들고 바로 시작할 수 있습니다."
        }
        isLoggedIn={Boolean(user)}
        primaryLabel="입주 준비 시작하기"
        showLoginLink
      />
    </main>
  );
}
