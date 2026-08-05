import { coreLegalMessage, legalPrinciples } from "@/data/legalPrinciples";
import { PrincipleCard } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";

export function LegalPrinciplesSection() {
  return (
    <Section className="bg-white">
      <SectionTitle
        eyebrow="Principles"
        title="경계를 명확히 할수록, 서비스는 더 신뢰할 수 있습니다."
        description={coreLegalMessage}
      />
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {legalPrinciples.map(([category, does, doesNot]) => (
          <PrincipleCard key={category} category={category} does={does} doesNot={doesNot} />
        ))}
      </div>
    </Section>
  );
}
