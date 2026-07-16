import { pricingPlans } from "@/data/pricing";
import { PricingCard } from "@/components/ui/PricingCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ReportPreviewMockup } from "./NativeMockups";

export function PricingSection() {
  return (
    <section className="bg-cream/70 px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle eyebrow="Pricing" title="생활 정보의 깊이에 따라 선택하세요." />
        <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {pricingPlans.map((plan) => (
            <PricingCard key={plan.name} {...plan} />
          ))}
        </div>
        <div className="mt-10">
          <ReportPreviewMockup />
        </div>
      </div>
    </section>
  );
}
