import { handoverPreview } from "@/data/features";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  DaylightIllustration,
  KeyHandoverIllustration,
} from "@/components/illustrations/HandoverIllustrations";
import { cn } from "@/lib/cn";

const visuals = [
  { Illustration: DaylightIllustration, caption: "채광·수납 상태 확인", bgClass: "bg-mint" },
  { Illustration: KeyHandoverIllustration, caption: "열쇠 인계", bgClass: "bg-cream" },
];

const examples = [
  "겨울철 안방 창가 결로를 확인하는 것이 좋습니다.",
  "평일 밤 9시 이후에는 주차 공간이 부족할 수 있어 확인이 필요합니다.",
  "싱크대 하부장 냄새 여부는 입주 전 확인해보는 것을 권장합니다.",
  "반려동물과 생활할 경우 방충망과 창문 안전을 먼저 확인해보세요."
];

export function HomeHandoverSection() {
  return (
    <Section className="bg-white">
      <SectionTitle
        eyebrow="Handover"
        title="후기가 아니라, 다음 사용자를 위한 인수인계입니다."
        description="집은 물론 사무실과 공장도 좋다/나쁘다를 평가하지 않고 미리 알면 좋은 사용 정보와 확인사항을 전달합니다."
      />
      <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="flex flex-wrap gap-3">
            {handoverPreview.map((item) => (
              <Badge key={item} className="bg-cream text-forest">
                {item}
              </Badge>
            ))}
          </div>
          <p className="mt-6 rounded-2xl bg-mint p-4 text-sm font-semibold leading-7 text-forest">
            온네스트는 사람을 평가하지 않습니다. 공간과 실제 사용 경험을 인수인계합니다.
          </p>
        </Card>
        <div className="grid grid-cols-2 gap-5">
          {visuals.map(({ Illustration, caption, bgClass }) => (
            <figure
              key={caption}
              className="group relative isolate overflow-hidden rounded-[24px] border border-forest/10 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft"
            >
              <div className={cn("relative h-full min-h-[180px]", bgClass)}>
                <Illustration className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-forest/90 via-forest/40 to-transparent" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 p-4 text-sm font-bold text-white drop-shadow-sm">
                {caption}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
      <Card className="mt-5 bg-cream/70">
        <p className="text-sm font-bold text-sage">이전 사용자가 남긴 인수인계 예시</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {examples.map((example) => (
            <div
              key={example}
              className="rounded-2xl border border-forest/10 bg-white p-4 text-sm font-semibold leading-7 text-ink/75"
            >
              {example}
            </div>
          ))}
        </div>
        <p className="mt-5 text-xs leading-6 text-ink/55">
          집주인, 관리실, 중개사, 이웃을 평가하지 않고 “확인 필요”, “권장”, “체감 정보”의 톤을 유지합니다.
        </p>
      </Card>
    </Section>
  );
}
