import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { cn } from "@/lib/cn";

const bentoCards = [
  {
    title: "우리집 인수인계서",
    description: "퇴거자가 남긴 생활 정보로 채광, 수납, 결로, 주차, 반려동물 생활 팁을 확인합니다.",
    tags: ["채광", "수압", "결로", "주차", "반려동물"],
    className: "md:col-span-2 md:row-span-2 bg-forest text-white",
    image: "/images/property/living-room.jpg",
    report: {
      title: "유료 리포트",
      description: "야간 주차 체감, 시간대별 소음, 입주 전 질문지를 더 깊이 확인합니다.",
      tags: ["주차 체감", "소음", "질문지"],
    },
  },
  {
    title: "계약 안전 체크패스",
    description: "HUG, 등기, 전입신고, 확정일자를 위험도 판정 없이 확인 절차로 관리합니다.",
    tags: ["HUG", "등기", "전입신고", "확정일자"],
    className: "bg-white",
  },
  {
    title: "입주 프로젝트",
    description: "계약부터 입주까지 진행률과 다음 액션을 하나의 카드에서 봅니다.",
    tags: ["진행률", "자료함", "일정"],
    className: "bg-mint",
  },
  {
    title: "반려동물 확인",
    description: "방충망, 산책로, 추가 보증금처럼 계약 전 확인할 항목을 정리합니다.",
    tags: ["방충망", "산책로", "보증금"],
    className: "bg-cream",
  },
  {
    title: "맞춤 준비물",
    description: "제습기, 수납가구, 인터넷, 입주청소 같은 선택지를 집 상태에 맞춰 정리합니다.",
    tags: ["제습기", "수납", "인터넷"],
    className: "bg-white",
  },
];

export function BentoFeatureGrid() {
  return (
    <section className="bg-white px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Overview"
          title="집을 찾은 뒤, 진짜 준비가 시작됩니다."
          description="온네스트는 매물 광고가 아니라 이전 사용자의 인수인계 정보, 확인 절차, 입주 준비 액션을 하나의 화면 흐름으로 묶습니다."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {bentoCards.map((card) => (
            <Card
              key={card.title}
              className={cn(card.image && "relative isolate overflow-hidden", card.className)}
            >
              {card.image ? (
                <>
                  <Image
                    src={card.image}
                    alt={card.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="absolute inset-0 -z-10 object-cover opacity-45"
                  />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-forest via-forest/85 to-forest/50" />
                </>
              ) : null}
              <div
                className={cn(
                  "flex h-full min-h-[210px] flex-col",
                  card.image && "min-h-[430px] md:min-h-[500px]",
                )}
              >
                <div>
                  <h3 className="text-2xl font-black">{card.title}</h3>
                  <p className="mt-4 text-sm leading-7 opacity-75">{card.description}</p>
                </div>
                <div className="mt-auto pt-6">
                  <div className="flex flex-wrap gap-2">
                    {card.tags.map((tag) => (
                      <Badge key={tag} className="bg-white/80 text-forest">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  {card.report ? (
                    <div className="mt-4 rounded-lg border border-white/15 bg-navy/90 p-4 shadow-lg backdrop-blur-sm">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                        <div className="max-w-md">
                          <p className="text-[11px] font-black uppercase text-mint">Premium Report</p>
                          <h4 className="mt-1 text-xl font-black text-white">{card.report.title}</h4>
                          <p className="mt-1 text-xs leading-5 text-white/70">{card.report.description}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-2">
                          {card.report.tags.map((tag) => (
                            <Badge key={tag} className="bg-white/90 text-navy">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
