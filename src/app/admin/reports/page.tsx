import { adminTables } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function AdminReportsPage() {
  return (
    <AppShell title="유료 리포트 관리" description="구독형 리포트와 건별 Project Pass 발행, 결제, 환불 상태를 확인합니다.">
      <AdminTablePreview title="리포트 목록" columns={adminTables.reports} />
    </AppShell>
  );
}
