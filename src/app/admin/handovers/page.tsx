import { adminTables } from "@/data/appMock";
import { AdminTablePreview } from "@/components/app/AppCards";
import { AppShell } from "@/components/app/AppShell";

export default function AdminHandoversPage() {
  return (
    <AppShell title="인수인계서 검수" description="AI 검수와 관리자 검수 상태를 확인하고 비공개/수정 요청 대상을 관리하는 화면입니다.">
      <AdminTablePreview title="인수인계서 목록" columns={adminTables.handovers} />
    </AppShell>
  );
}
