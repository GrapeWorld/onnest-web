import { adminTables, appStats } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { AdminReviewMockup } from "@/components/sections/NativeMockups";

export default function AdminPage() {
  return (
    <AppShell title="관리자 대시보드" description="회원, 건물, 인수인계서, 리포트, 서비스 리드, 파트너, 리워드를 운영자가 확인하는 더미 관리자 홈입니다.">
      <MetricGrid items={appStats} />
      <div className="mt-6">
        <AdminReviewMockup />
      </div>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <AdminTablePreview title="최근 인수인계서" columns={adminTables.handovers} />
        <AdminTablePreview title="최근 서비스 리드" columns={adminTables.serviceLeads} />
      </div>
    </AppShell>
  );
}
