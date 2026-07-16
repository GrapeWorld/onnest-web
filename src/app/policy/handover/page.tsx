import { allowedHandoverItems, restrictedHandoverItems, reviewProcess } from "@/data/handoverRules";
import { HandoverRuleTable } from "@/components/ui/PolicyTables";
import { PolicyLayout } from "@/components/ui/PolicyLayout";

export default function HandoverPolicyPage() {
  return (
    <PolicyLayout
      eyebrow="Handover Policy"
      title="인수인계서는 다음 입주자를 위한 생활 정보입니다."
      description="온네스트의 인수인계서는 자유로운 비판 리뷰가 아니라, 다음 입주자를 위한 안전한 생활 정보입니다."
    >
      <p>작성자는 공간, 시설, 생활 경험에 관한 정보를 남길 수 있으며, 특정 개인이나 단체를 비방하거나 식별할 수 있는 내용은 작성할 수 없습니다.</p>
      <HandoverRuleTable allowed={allowedHandoverItems} restricted={restrictedHandoverItems} />
      <h2>검수 프로세스</h2>
      <ol>{reviewProcess.map((item) => <li key={item}>{item}</li>)}</ol>
      <h2>핵심 문구</h2>
      <p>온네스트는 사람을 평가하지 않습니다. 공간과 생활 경험을 인수인계합니다.</p>
    </PolicyLayout>
  );
}
