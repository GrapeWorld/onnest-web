import { CalendarCheck, Link2, NotebookPen } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FeatureCard } from "@/components/ui/Card";

const coreFeatures = [
  {
    title: "준비 일정 관리",
    description: "계약, 이사, 입주까지 놓치기 쉬운 일정을 프로젝트 하나로 모아 관리합니다.",
    icon: CalendarCheck,
  },
  {
    title: "필요한 서비스 연결",
    description: "이사·청소·인터넷 설치 등 입주 단계에 맞는 서비스를 필요한 순간에 연결합니다.",
    icon: Link2,
  },
  {
    title: "중요한 생활 정보 기록 및 확인",
    description: "채광, 결로, 소음처럼 미리 알아두면 좋은 생활 정보를 남기고 확인합니다.",
    icon: NotebookPen,
  },
];

export function CoreFeaturesSection() {
  return (
    <Section className="bg-white">
      <SectionTitle
        eyebrow="Features"
        title="입주 준비에 꼭 필요한 것만 담았습니다."
        align="center"
      />
      <div className="mt-10 grid gap-5 md:grid-cols-3">
        {coreFeatures.map((feature) => (
          <FeatureCard key={feature.title} {...feature} />
        ))}
      </div>
    </Section>
  );
}
