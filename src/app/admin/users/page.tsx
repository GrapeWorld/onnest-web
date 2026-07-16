import { adminTables } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function AdminUsersPage() {
  return (
    <AppShell title="회원 관리" description="가입자, 구독 상태, 프로젝트 수, 문의 이력을 확인하는 관리자 화면입니다.">
      <AdminTablePreview title="회원 목록" columns={adminTables.users} />
    </AppShell>
  );
}
