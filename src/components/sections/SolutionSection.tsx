import { solutionFeatureCards } from "@/data/features";
import { Badge } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { FeatureImage } from "@/components/ui/FeatureImage";
import { cn } from "@/lib/cn";

const sizesByCardId: Record<string, string> = {
  handover: "(min-width: 1024px) 55vw, (min-width: 768px) 48vw, 92vw",
  "contract-check": "(min-width: 1024px) 40vw, (min-width: 768px) 48vw, 92vw",
  "official-channel": "(min-width: 1024px) 40vw, (min-width: 768px) 48vw, 92vw",
  "move-in-project": "(min-width: 1024px) 46vw, (min-width: 768px) 48vw, 92vw",
  "service-matching": "(min-width: 1024px) 46vw, (min-width: 768px) 48vw, 92vw"
};

export function SolutionSection() {
  return (
    <Section className="bg-cream/60">
      <Badge>Solution</Badge>
      <h2 className="mt-4 max-w-[980px] break-keep text-balance text-[clamp(2.625rem,4.4vw,4.25rem)] font-bold leading-[1.12] tracking-[-0.035em] text-forest">
        입주 전 과정을 다섯 축으로 연결합니다.
      </h2>
      <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-12">
        {solutionFeatureCards.map((card) => (
          <div
            key={card.id}
            className={cn(
              "group flex h-full flex-col overflow-hidden rounded-[28px] border border-[rgba(47,93,70,0.12)] shadow-[0_18px_50px_rgba(24,63,53,0.08),0_2px_8px_rgba(24,63,53,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_60px_rgba(24,63,53,0.12),0_4px_10px_rgba(24,63,53,0.06)]",
              card.className
            )}
          >
            <div className="relative aspect-[16/10] min-h-[220px] w-full lg:aspect-auto lg:flex-1">
              <FeatureImage
                src={card.image}
                alt={card.alt}
                sizes={sizesByCardId[card.id]}
                objectPosition={card.objectPosition}
              />
            </div>
            <div className="shrink-0 bg-[rgba(247,242,232,0.97)] px-6 py-5">
              <Badge>{card.label}</Badge>
              <h3 className="mt-3 line-clamp-2 break-keep text-balance text-xl font-bold leading-snug text-forest md:text-2xl">
                {card.title}
              </h3>
              <p className="mt-2 line-clamp-3 break-keep text-[15px] leading-7 text-ink/70 md:text-base">
                {card.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}
