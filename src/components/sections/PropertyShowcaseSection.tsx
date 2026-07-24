import Image from "next/image";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { cn } from "@/lib/cn";

type ShowcaseItem = {
  src: string;
  alt: string;
  caption: string;
  tag: string;
  className?: string;
};

const showcaseItems: ShowcaseItem[] = [
  {
    src: "/images/property/living-room.jpg",
    alt: "채광이 좋은 거실 인테리어",
    caption: "채광·수납 상태 확인",
    tag: "생활 정보",
    className: "md:col-span-3 md:row-span-2",
  },
  {
    src: "/images/property/apartment-exterior.jpg",
    alt: "아파트 외관 전경",
    caption: "단지 외관 · 주차 동선",
    tag: "단지 정보",
    className: "md:col-span-2",
  },
  {
    src: "/images/property/keys-lock-home.jpg",
    alt: "집 열쇠를 주고받는 손",
    caption: "열쇠 인계",
    tag: "인수인계",
    className: "md:col-span-2",
  },
  {
    src: "/images/property/handover-contract.jpg",
    alt: "계약서에 서명하는 손과 열쇠 세트",
    caption: "계약서 서명 · 확정일자",
    tag: "계약 체크",
    className: "md:col-span-3",
  },
];

export function PropertyShowcaseSection() {
  return (
    <section className="bg-cream px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Real Cases"
          title="실제 인수인계 현장은 이런 모습입니다."
          description="사진과 함께 남겨진 생활 정보라 이해가 빠릅니다. 채광과 수납 상태부터 열쇠 인계, 계약서 서명까지 — 온네스트는 각 단계의 기록을 그대로 다음 입주자에게 전달합니다."
        />
        <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-5">
          {showcaseItems.map((item) => (
            <figure
              key={item.src}
              className={cn(
                "group relative isolate overflow-hidden rounded-[24px] border border-forest/10 bg-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft",
                item.className
              )}
            >
              <div className="relative h-64 w-full md:h-full md:min-h-[220px]">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  sizes="(min-width: 768px) 40vw, 100vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-forest/80 via-forest/10 to-transparent" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5">
                <span className="inline-flex w-fit rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-forest">
                  {item.tag}
                </span>
                <span className="text-lg font-black text-white drop-shadow-sm">{item.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
