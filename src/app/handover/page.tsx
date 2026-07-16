import { handoverFlow } from "@/data/timeline";
import { allowedHandoverItems, restrictedHandoverItems, reviewProcess } from "@/data/handoverRules";
import { CTASection } from "@/components/sections/CTASection";
import { Card } from "@/components/ui/Card";
import { HandoverRuleTable } from "@/components/ui/PolicyTables";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Timeline } from "@/components/ui/Timeline";

export default function HandoverPage() {
  return (
    <main className="bg-white">
      <section className="bg-cream px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Handover"
            title="후기가 아니라 인수인계입니다."
            description="온네스트의 우리집 인수인계서는 퇴거자 또는 이전 거주자가 다음 입주자를 위해 남기는 생활 정보입니다. 좋다/나쁘다를 평가하는 리뷰가 아니라, 입주 전 미리 알면 좋은 사용 팁과 확인사항을 전달합니다."
          />
          <Card className="mt-8 bg-mint text-xl font-bold text-forest">
            온네스트는 사람을 평가하지 않습니다. 공간과 생활 경험을 인수인계합니다.
          </Card>
        </div>
      </section>
      <section className="px-5 py-16 md:py-24">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.8fr_1.2fr]">
          <SectionTitle eyebrow="3분 작성 UX" title="선택형 질문 중심의 안전한 작성 흐름" />
          <Timeline items={handoverFlow} />
        </div>
      </section>
      <section className="bg-cream/50 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Rules" title="쓸 수 있는 것과 쓸 수 없는 것을 구분합니다." />
          <div className="mt-10">
            <HandoverRuleTable allowed={allowedHandoverItems} restricted={restrictedHandoverItems} />
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {reviewProcess.map((step) => <Card key={step}>{step}</Card>)}
          </div>
        </div>
      </section>
      <CTASection title="안전한 생활 인수인계 문화를 함께 만듭니다." />
    </main>
  );
}
