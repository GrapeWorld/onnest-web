import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function HandoverDetailPage() {
  return (
    <AppShell title="우리집 인수인계서 상세" description="퇴거자 또는 이전 거주자가 남긴 생활 정보 리포트의 더미 상세 화면입니다.">
      <div className="grid gap-5 md:grid-cols-3">
        {["채광은 오전에 좋음", "야간 주차는 확인 필요", "반려동물 가능 여부 계약 전 확인", "결로는 겨울 현장 확인", "인터넷 설치 이력 있음", "생활 인프라 편리"].map((item) => <Card key={item}>{item}</Card>)}
      </div>
    </AppShell>
  );
}
