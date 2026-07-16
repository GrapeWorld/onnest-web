import { handoverPreview } from "@/data/features";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { HandoverFlowMockup } from "./NativeMockups";

export function HandoverPreviewSection() {
  return (
    <section className="bg-white px-5 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <div>
          <SectionTitle
            eyebrow="Handover"
            title="후기가 아니라, 다음 사용자를 위한 인수인계입니다."
            description="집은 물론 사무실과 공장도 좋다/나쁘다를 평가하지 않고 미리 알면 좋은 사용 정보와 확인사항을 전달합니다."
          />
          <Card className="mt-8">
            <div className="flex flex-wrap gap-3">
              {handoverPreview.map((item) => (
                <Badge key={item} className="bg-cream text-forest">{item}</Badge>
              ))}
            </div>
            <p className="mt-6 rounded-2xl bg-mint p-4 text-sm font-semibold leading-7 text-forest">
              온네스트는 사람을 평가하지 않습니다. 공간과 실제 사용 경험을 인수인계합니다.
            </p>
          </Card>
        </div>
        <HandoverFlowMockup />
      </div>
    </section>
  );
}
