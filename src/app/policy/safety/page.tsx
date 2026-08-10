import { coreLegalMessage } from "@/data/legalPrinciples";
import { LegalPrincipleTable } from "@/components/ui/PolicyTables";
import { PolicyLayout } from "@/components/ui/PolicyLayout";
import { SafetyCheckpassSection } from "@/components/sections/SafetyCheckpassSection";
import { InsuranceGuidanceSection } from "@/components/sections/InsuranceGuidanceSection";

export default function SafetyPolicyPage() {
  return (
    <>
      <PolicyLayout eyebrow="Policy" title="더 안전한 연결을 위한 운영 원칙" description={coreLegalMessage}>
        <div className="overflow-x-auto">
          <LegalPrincipleTable />
        </div>
        <h2>핵심 원칙</h2>
        <p>{coreLegalMessage}</p>
      </PolicyLayout>
      {/* 홈에서는 요약만 남기고 뺀 계약 안전·보증보험 상세 안내를 여기서 확인할 수 있다. */}
      <SafetyCheckpassSection />
      <InsuranceGuidanceSection />
    </>
  );
}
