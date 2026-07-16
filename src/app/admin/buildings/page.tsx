import { adminTables } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function AdminBuildingsPage() {
  return (
    <AppShell title="건물 관리" description="건물별 인수인계서 수, 주소, 검수 상태를 확인하는 관리자 화면입니다.">
      <AdminTablePreview title="건물 목록" columns={adminTables.buildings} />
    </AppShell>
  );
}
