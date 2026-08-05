import { CTASection } from "@/components/sections/CTASection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HomeHandoverSection } from "@/components/sections/HomeHandoverSection";
import { InsuranceGuidanceSection } from "@/components/sections/InsuranceGuidanceSection";
import { LegalPrinciplesSection } from "@/components/sections/LegalPrinciplesSection";
import { ProblemSection } from "@/components/sections/ProblemSection";
import { ProjectTimelineSection } from "@/components/sections/ProjectTimelineSection";
import { SafetyCheckpassSection } from "@/components/sections/SafetyCheckpassSection";
import { ServiceConnectionSection } from "@/components/sections/ServiceConnectionSection";
import { SolutionSection } from "@/components/sections/SolutionSection";

export default function Home() {
  return (
    <main>
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HomeHandoverSection />
      <SafetyCheckpassSection />
      <InsuranceGuidanceSection />
      <ProjectTimelineSection />
      <ServiceConnectionSection />
      <LegalPrinciplesSection />
      <CTASection />
    </main>
  );
}
