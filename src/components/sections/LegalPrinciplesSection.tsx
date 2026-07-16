import { coreLegalMessage } from "@/data/legalPrinciples";
import { LegalPrincipleTable } from "@/components/ui/PolicyTables";
import { SectionTitle } from "@/components/ui/SectionTitle";

export function LegalPrinciplesSection() {
  return (
    <section className="bg-white px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Principles"
          title="경계를 명확히 할수록, 서비스는 더 신뢰할 수 있습니다."
          description={coreLegalMessage}
        />
        <div className="mt-10 overflow-x-auto">
          <LegalPrincipleTable />
        </div>
      </div>
    </section>
  );
}
