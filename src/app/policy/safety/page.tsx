import { coreLegalMessage } from "@/data/legalPrinciples";
import { LegalPrincipleTable } from "@/components/ui/PolicyTables";
import { PolicyLayout } from "@/components/ui/PolicyLayout";

export default function SafetyPolicyPage() {
  return (
    <PolicyLayout eyebrow="Policy" title="더 안전한 연결을 위한 운영 원칙" description={coreLegalMessage}>
      <div className="overflow-x-auto">
        <LegalPrincipleTable />
      </div>
      <h2>핵심 원칙</h2>
      <p>{coreLegalMessage}</p>
    </PolicyLayout>
  );
}
