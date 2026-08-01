import { SectionTitle } from "@/components/ui/SectionTitle";
import {
  BuildingIllustration,
  ContractIllustration,
  DaylightIllustration,
  KeyHandoverIllustration,
} from "@/components/illustrations/HandoverIllustrations";
import { cn } from "@/lib/cn";

type ShowcaseItem = {
  Illustration: (props: { className?: string }) => React.JSX.Element;
  caption: string;
  tag: string;
  /** 일러스트 배경과 같은 색이라 남는 여백이 이어져 보인다. */
  bgClass: string;
  className?: string;
};

const showcaseItems: ShowcaseItem[] = [
  {
    Illustration: DaylightIllustration,
    caption: "채광·수납 상태 확인",
    tag: "생활 정보",
    bgClass: "bg-mint",
    className: "md:col-span-3 md:row-span-2",
  },
  {
    Illustration: BuildingIllustration,
    caption: "단지 외관 · 주차 동선",
    tag: "단지 정보",
    bgClass: "bg-cream",
    className: "md:col-span-2",
  },
  {
    Illustration: KeyHandoverIllustration,
    caption: "열쇠 인계",
    tag: "인수인계",
    bgClass: "bg-mint",
    className: "md:col-span-2",
  },
  {
    Illustration: ContractIllustration,
    caption: "계약서 서명 · 확정일자",
    tag: "계약 체크",
    bgClass: "bg-cream",
    className: "md:col-span-3",
  },
];

export function PropertyShowcaseSection() {
  return (
    <section className="bg-cream px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="How It Works"
          title="이런 정보가 다음 입주자에게 남습니다."
          description="채광과 수납 상태부터 열쇠 인계, 계약서 서명까지 — 온네스트는 각 단계의 기록을 정리해 다음 사용자에게 전달합니다. 아래는 어떤 항목이 남는지 보여주는 예시입니다."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-5">
          {showcaseItems.map((item) => (
            <figure
              key={item.caption}
              className={cn(
                "group relative isolate overflow-hidden rounded-[24px] border border-forest/10 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft",
                item.className,
              )}
            >
              <div
                className={cn(
                  "relative h-64 w-full md:h-full md:min-h-[220px]",
                  item.bgClass,
                )}
              >
                <item.Illustration className="absolute inset-0 h-full w-full transition duration-500 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none" />
                {/* 사진과 달리 그림은 전체를 덮으면 탁해진다.
                    캡션이 놓이는 아래쪽만 가려 글자만 읽히게 한다. */}
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-forest/95 via-forest/55 to-transparent" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
                <span className="inline-flex w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-forest">
                  {item.tag}
                </span>
                <span className="text-lg font-black text-white drop-shadow-sm">
                  {item.caption}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
