import { AppShell, ChecklistPanel } from "@/components/app/AppShell";
import { SafetyCheckpassMockup } from "@/components/sections/NativeMockups";

export default function SafetyCheckpassPage() {
  return (
    <AppShell title="계약 안전 체크패스" description="위험도를 직접 판정하지 않고, HUG 안심전세 앱, 등기부등본, 전입신고, 확정일자 등 공식 확인 흐름을 체크합니다.">
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <ChecklistPanel items={[["HUG 안심전세 앱 확인", "확인 필요"], ["등기부등본 발급", "확인 필요"], ["계약 자료 보관", "대기"], ["전입신고 일정", "대기"], ["확정일자 일정", "대기"]]} />
        <SafetyCheckpassMockup />
      </div>
    </AppShell>
  );
}
