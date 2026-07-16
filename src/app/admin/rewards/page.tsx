import { adminTables } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function AdminRewardsPage() {
  return (
    <AppShell title="리워드 관리" description="인수인계서 작성 리워드 대상, 금액, 지급 상태를 확인합니다.">
      <AdminTablePreview title="리워드 목록" columns={adminTables.rewards} />
    </AppShell>
  );
}
