import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function NewProjectPage() {
  return (
    <AppShell title="새 입주 프로젝트 만들기" description="집 후보를 저장하고 입주 예정일, 확인 항목, 문서함을 하나의 프로젝트로 묶는 시작 화면입니다.">
      <Card>
        <div className="grid gap-4 md:grid-cols-2">
          {["프로젝트 이름", "주소", "입주 예정일", "예산 범위"].map((label) => (
            <label key={label} className="grid gap-2 text-sm font-semibold text-forest">{label}<input className="rounded-2xl border border-forest/15 px-4 py-3" placeholder={`${label} 입력`} /></label>
          ))}
        </div>
        <Button href="/projects/demo" className="mt-6">더미 프로젝트 생성</Button>
      </Card>
    </AppShell>
  );
}
