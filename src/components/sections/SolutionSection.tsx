import { solutionPillars } from "@/data/features";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SolutionPillarCard } from "@/components/ui/Card";

export function SolutionSection() {
  return (
    <section className="bg-cream/60 px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle eyebrow="Solution" title="입주 전 과정을 다섯 축으로 연결합니다." />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          {solutionPillars.map((pillar) => (
            <SolutionPillarCard key={pillar.title} {...pillar} />
          ))}
        </div>
      </div>
    </section>
  );
}
