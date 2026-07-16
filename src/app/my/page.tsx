import { appStats } from "@/data/appMock";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function MyPage() {
  return (
    <AppShell title="마이페이지" description="내 프로젝트, 구독, 리포트, 문의 이력을 확인하는 사용자 대시보드입니다.">
      <MetricGrid items={appStats} />
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {["내 프로젝트", "구독 상태", "리포트 구매 이력"].map((item) => <Card key={item}>{item}</Card>)}
      </div>
    </AppShell>
  );
}
