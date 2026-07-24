import { BentoFeatureGrid } from "@/components/sections/BentoFeatureGrid";
import { CTASection } from "@/components/sections/CTASection";
import { HandoverExampleCard } from "@/components/sections/HandoverExampleCard";
import { HandoverPreviewSection } from "@/components/sections/HandoverPreviewSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { LegalPrinciplesSection } from "@/components/sections/LegalPrinciplesSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { ProjectTimelineSection } from "@/components/sections/ProjectTimelineSection";
import { PropertyShowcaseSection } from "@/components/sections/PropertyShowcaseSection";
import { ServiceConnectionSection } from "@/components/sections/ServiceConnectionSection";
import { SolutionSection } from "@/components/sections/SolutionSection";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <PropertyShowcaseSection />
      <BentoFeatureGrid />
      <ProblemSection />
      <SolutionSection />
      <HandoverPreviewSection />
      <HandoverExampleCard />
      <ProjectTimelineSection />
      <ServiceConnectionSection />
      <PricingSection />
      <LegalPrinciplesSection />
      <CTASection />
    </main>
  );
}
