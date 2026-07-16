import { moveInTimeline } from "@/data/timeline";
import { projectTools } from "@/data/features";
import { CTASection } from "@/components/sections/CTASection";
import { Card, FeatureCard } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Timeline } from "@/components/ui/Timeline";

export default function MoveInPage() {
  return (
    <main>
      <section className="bg-cream px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Move-in Project"
            title="집 후보 저장부터 퇴거 인수인계까지, 하나의 프로젝트로"
            description="온네스트는 집을 찾는 앱이 아니라, 집을 선택한 뒤 계약부터 실제 입주 완료까지 필요한 절차를 하나의 프로젝트로 관리하는 서비스입니다."
          />
        </div>
      </section>
      <section className="bg-white px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <SectionTitle eyebrow="Timeline" title="입주 프로젝트 10단계" />
          <Timeline items={moveInTimeline} />
        </div>
      </section>
      <section className="bg-cream/60 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Tools" title="입주 준비를 흩어지지 않게 관리합니다." />
          <div className="mt-10 grid gap-5 md:grid-cols-5">
            {projectTools.map((tool) => <FeatureCard key={tool} title={tool} description="입주 프로젝트의 현재 상태와 다음 확인 항목을 한 화면에서 볼 수 있게 설계합니다." />)}
          </div>
          <Card className="mt-8">계약 안전 체크패스는 위험도를 단정하지 않고 확인 필요 항목과 공식기관 확인 권장을 안내합니다.</Card>
        </div>
      </section>
      <CTASection title="입주 과정을 프로젝트처럼 관리하세요." />
    </main>
  );
}
