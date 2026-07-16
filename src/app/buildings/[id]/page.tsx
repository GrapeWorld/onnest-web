import { buildingCards, projectChecklist } from "@/data/appMock";
import { AppShell, ChecklistPanel } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function BuildingDetailPage() {
  const building = buildingCards[0];
  return (
    <AppShell title={building.name} description="건물 상세 화면입니다. 실제 매물 계약 알선이 아니라 생활 정보, 인수인계서, 확인 체크포인트 중심으로 구성했습니다.">
      <div className="grid gap-5 md:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <p className="text-sm text-ink/60">{building.address}</p>
          <div className="mt-5 flex flex-wrap gap-2">{building.tags.map((tag) => <span key={tag} className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-forest">{tag}</span>)}</div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <Card className="shadow-none">인수인계서 2건</Card>
            <Card className="shadow-none">주차 확인 필요</Card>
            <Card className="shadow-none">계약 전 확인 권장</Card>
          </div>
          <Button href="/projects/new" className="mt-6">프로젝트로 저장</Button>
        </Card>
        <ChecklistPanel items={projectChecklist} />
      </div>
    </AppShell>
  );
}
