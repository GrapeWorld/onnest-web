import { appStats, projectChecklist } from "@/data/appMock";
import { AppShell, ChecklistPanel, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function ProjectPage() {
  return (
    <AppShell title="한남 리버하우스 입주 프로젝트" description="계약 전 확인부터 입주 서비스 연결, 문서함, 일정까지 한 프로젝트에서 관리하는 더미 대시보드입니다.">
      <MetricGrid items={appStats} />
      <div className="mt-6 grid gap-5 md:grid-cols-[0.9fr_1.1fr]">
        <ChecklistPanel items={projectChecklist} />
        <Card>
          <h2 className="text-xl font-bold text-forest">다음 추천 액션</h2>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            <Button href="/projects/demo/visit-check" variant="ghost">방문 체크</Button>
            <Button href="/projects/demo/safety-checkpass" variant="ghost">안전 체크패스</Button>
            <Button href="/projects/demo/services" variant="ghost">서비스 연결</Button>
            <Button href="/projects/demo/documents" variant="ghost">문서함</Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
