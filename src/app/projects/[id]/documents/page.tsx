import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function DocumentsPage() {
  return (
    <AppShell title="문서함" description="계약서, 등기부, 입주 사진, 하자 확인 사진을 보관하는 더미 화면입니다. 민감정보 마스킹 안내를 포함합니다.">
      <Card>
        <div className="rounded-2xl border border-dashed border-forest/25 bg-cream p-10 text-center text-forest">파일 업로드 영역</div>
        <p className="mt-4 text-sm text-ink/60">주민등록번호, 계좌번호 등 불필요한 민감정보는 마스킹 또는 삭제를 권장합니다.</p>
      </Card>
    </AppShell>
  );
}
