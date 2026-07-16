import { adminTables } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function AdminServiceLeadsPage() {
  return (
    <AppShell title="서비스 리드 관리" description="이사, 청소, 인터넷, 렌탈, 보수 등 파트너 연결 요청의 처리 상태를 확인합니다.">
      <AdminTablePreview title="서비스 리드 목록" columns={adminTables.serviceLeads} />
    </AppShell>
  );
}
