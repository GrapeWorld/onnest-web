import { AppShell, ChecklistPanel } from "@/components/app/AppShell";

export default function DepositInsurancePage() {
  return (
    <AppShell title="보증보험 공식 채널 연결" description="보험상품 비교·추천·판매 없이 HUG/HF/SGI 등 공식기관 또는 자격 있는 상담 채널 확인을 돕습니다.">
      <ChecklistPanel items={[["공식기관 링크 확인", "안내"], ["상담 채널 선택", "대기"], ["필요 서류 목록", "확인 필요"], ["신청 가능 여부 문의", "공식기관 확인 권장"]]} />
    </AppShell>
  );
}
