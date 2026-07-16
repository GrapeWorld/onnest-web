import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function CalendarPage() {
  return (
    <AppShell title="입주 일정 캘린더" description="계약일, 전입신고, 확정일자, 청소, 이사, 인터넷 설치 일정을 한 화면에 모읍니다.">
      <div className="grid gap-4 md:grid-cols-3">{["계약 당일 체크", "입주청소", "인터넷 설치", "전입신고", "확정일자", "퇴거 인수인계"].map((item) => <Card key={item}>{item}</Card>)}</div>
    </AppShell>
  );
}
