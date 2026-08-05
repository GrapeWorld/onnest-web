import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { Timeline } from "@/components/ui/Timeline";
import { ContractIllustration } from "@/components/illustrations/HandoverIllustrations";
import { SafetyCheckpassMockup } from "./NativeMockups";

const checkSteps = [
  "HUG 안심전세 앱으로 위험 매물 여부 확인",
  "등기부등본으로 근저당·압류 확인",
  "전입신고와 확정일자 받기",
  "계약 자료 사진·영수증 보관"
];

export function SafetyCheckpassSection() {
  return (
    <Section className="bg-white">
      <SectionTitle
        eyebrow="Safety"
        title="위험도 판정이 아닌, 확인 절차를 관리합니다."
        description="HUG 안심전세, 등기부등본, 전입신고, 확정일자, 계약 자료 보관까지 — 계약 전후로 놓치기 쉬운 확인 절차를 체크리스트로 정리합니다."
      />
      <div className="mt-10 grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="overflow-hidden rounded-[24px] border border-forest/10 bg-cream shadow-card">
            <ContractIllustration className="h-40 w-full" />
          </div>
          <div className="mt-5">
            <Timeline items={checkSteps} />
          </div>
          <Card className="mt-2 bg-navy text-white">
            <p className="text-sm leading-7">
              온네스트는 확인 절차를 안내하고 관리를 돕습니다. 매물의 안전성이나 계약의 법적 유효성을
              직접 판정하지 않으며, 최종 판단은 등기부등본 등 공적 서류와 전문가 확인을 통해
              사용자가 내려야 합니다.
            </p>
          </Card>
        </div>
        <SafetyCheckpassMockup />
      </div>
    </Section>
  );
}
