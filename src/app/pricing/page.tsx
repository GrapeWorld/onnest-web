import { comparisonRows, pricingPlans } from "@/data/pricing";
import { CTASection } from "@/components/sections/CTASection";
import { Card } from "@/components/ui/Card";
import { PricingCard } from "@/components/ui/PricingCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ReportPreviewMockup } from "@/components/sections/NativeMockups";

export default function PricingPage() {
  return (
    <main>
      <section className="bg-cream px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Pricing"
            title="생활 정보의 깊이에 따라 선택하세요."
            description="온네스트는 기본 인수인계 정보는 무료로 제공하고, 더 깊은 생활 정보와 입주 준비 리포트는 구독형 또는 건별 결제 방식으로 제공합니다."
          />
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {pricingPlans.map((plan) => <PricingCard key={plan.name} {...plan} />)}
          </div>
          <div className="mt-10">
            <ReportPreviewMockup />
          </div>
        </div>
      </section>
      <section className="bg-white px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Compare" title="요금제 비교" />
          <div className="mt-10 overflow-x-auto rounded-[24px] border border-forest/10 bg-white shadow-soft">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-forest text-white">
                <tr><th className="p-4">항목</th><th className="p-4">Free</th><th className="p-4">Basic</th><th className="p-4">Premium</th><th className="p-4">Project Pass</th></tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row[0]} className="border-t border-forest/10">
                    {row.map((cell) => <td key={cell} className="p-4">{cell}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <Card>
              <h3 className="text-xl font-bold text-forest">주차 예시</h3>
              <ul className="mt-4 space-y-3 text-sm leading-7 text-ink/75">
                <li>세대당 주차대수 같은 공식 수치와 실제 야간 주차 체감은 다를 수 있습니다.</li>
                <li>주차장 한 칸 크기, 기둥 위치, 기계식 주차 여부, 대형차 제한 등은 현장 확인이 필요합니다.</li>
                <li>온네스트는 이전 입주자 체감 정보와 확인 체크포인트를 제공합니다.</li>
              </ul>
            </Card>
            <Card className="bg-cream">
              유료 리포트는 계약 판단이나 안전성 확정이 아니라, 이전 입주자의 생활 인수인계 데이터와 사용자가 확인해야 할 체크포인트를 구조화한 참고 정보입니다. 온네스트는 특정 집의 계약 적합성, 안전성, 보증보험 가능 여부, 주차 가능 여부를 보장하지 않습니다.
            </Card>
          </div>
        </div>
      </section>
      <CTASection title="요금제와 제휴 모델을 함께 논의해보세요." />
    </main>
  );
}
