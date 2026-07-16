import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

const chips = [
  "수압 확인",
  "결로 주의",
  "주차 확인",
  "방충망 체크",
  "수납 부족",
  "반려동물 확인 필요",
  "인터넷 설치 확인",
  "입주청소 추천",
];

const examples = [
  "겨울철 안방 창가 결로를 확인하는 것이 좋습니다.",
  "평일 밤 9시 이후에는 주차 공간이 부족할 수 있어 확인이 필요합니다.",
  "싱크대 하부장 냄새 여부는 입주 전 확인해보는 것을 권장합니다.",
  "반려동물과 생활할 경우 방충망과 창문 안전을 먼저 확인해보세요.",
];

export function HandoverExampleCard() {
  return (
    <section className="bg-cream/70 px-5 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <SectionTitle
          eyebrow="Example"
          title="살아봐야 알 수 있는 정보, 다음 사람에게 남깁니다."
          description="인수인계서는 평가가 아니라 다음 사용자가 미리 확인하면 좋은 체감 정보와 체크포인트입니다."
        />
        <Card className="bg-white">
          <p className="text-sm font-bold text-sage">이전 사용자가 남긴 인수인계 예시</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {chips.map((chip) => (
              <Badge key={chip} className="bg-mint text-forest">
                {chip}
              </Badge>
            ))}
          </div>
          <div className="mt-6 grid gap-3">
            {examples.map((example) => (
              <div key={example} className="rounded-2xl border border-forest/10 bg-cream/70 p-4 text-sm font-semibold leading-7 text-ink/75">
                {example}
              </div>
            ))}
          </div>
          <p className="mt-5 text-xs leading-6 text-ink/55">
            집주인, 관리실, 중개사, 이웃을 평가하지 않고 “확인 필요”, “권장”, “체감 정보”의 톤을 유지합니다.
          </p>
        </Card>
      </div>
    </section>
  );
}
