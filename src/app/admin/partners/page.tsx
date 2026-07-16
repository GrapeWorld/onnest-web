import { adminTables } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function AdminPartnersPage() {
  return (
    <AppShell title="파트너 관리" description="파트너 카테고리, 응답률, 정산 상태를 확인하는 더미 운영 화면입니다.">
      <AdminTablePreview title="파트너 목록" columns={adminTables.partners} />
    </AppShell>
  );
}
