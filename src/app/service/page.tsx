import { CTASection } from "@/components/sections/CTASection";
import { LegalPrinciplesSection } from "@/components/sections/LegalPrinciplesSection";
import { ProjectTimelineSection } from "@/components/sections/ProjectTimelineSection";
import { ServiceConnectionSection } from "@/components/sections/ServiceConnectionSection";
import { SolutionSection } from "@/components/sections/SolutionSection";
import { Button } from "@/components/ui/Button";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { HandoverFlowMockup } from "@/components/sections/NativeMockups";

export default function ServicePage() {
  return (
    <main>
      <section className="bg-cream px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <SectionTitle
              eyebrow="Service"
              title="온네스트는 공간을 찾은 다음의 과정을 연결합니다."
              description="온네스트는 부동산 매물 중개 서비스가 아닙니다. 집, 사무실, 공장처럼 실제 사용 전 확인이 필요한 공간의 인수인계서를 기반으로 계약 전후 확인, 공식 채널 연결, 입주·이전 서비스 준비를 하나의 프로젝트로 관리합니다."
            />
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="/handover">인수인계서 보기</Button>
              <Button href="/move-in" variant="ghost">입주 프로젝트 보기</Button>
            </div>
          </div>
          <HandoverFlowMockup />
        </div>
      </section>
      <SolutionSection />
      <ProjectTimelineSection />
      <ServiceConnectionSection />
      <LegalPrinciplesSection />
      <CTASection />
    </main>
  );
}
