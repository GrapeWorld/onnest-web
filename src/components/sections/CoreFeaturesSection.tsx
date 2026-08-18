import type { LucideIcon } from "lucide-react";
import { CalendarCheck, Link2, NotebookPen } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { FeatureCard } from "@/components/ui/Card";

export type CoreFeatureItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  linkLabel?: string;
};

const defaultFeatures: CoreFeatureItem[] = [
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

export function CoreFeaturesSection({
  title = "입주 준비에 꼭 필요한 것만 담았습니다.",
  items = defaultFeatures,
}: {
  title?: string;
  items?: CoreFeatureItem[];
}) {
  return (
    <Section className="bg-white">
      <SectionTitle eyebrow="Features" title={title} align="center" />
      <div className="mt-10 grid items-stretch gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((feature) => (
          <FeatureCard
            key={feature.title}
            title={feature.title}
            description={feature.description}
            icon={feature.icon}
            href={feature.href}
            linkLabel={feature.linkLabel}
          />
        ))}
      </div>
    </Section>
  );
}
