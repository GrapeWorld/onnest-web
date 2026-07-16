import { AppShell, ChecklistPanel } from "@/components/app/AppShell";

export default function VisitCheckPage() {
  return (
    <AppShell title="방문 전 체크리스트" description="채광, 환기, 수납, 결로, 곰팡이, 벌레, 주차, 소음 등 방문 시 확인할 항목을 정리합니다.">
      <ChecklistPanel items={[["채광 시간대 확인", "대기"], ["창문 환기 확인", "대기"], ["수납 깊이 측정", "대기"], ["결로 흔적 확인", "대기"], ["야간 주차 질문", "대기"]]} />
    </AppShell>
  );
}
