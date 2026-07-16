import { allowedHandoverItems } from "@/data/handoverRules";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function HandoverWritePage() {
  return (
    <AppShell title="우리집 인수인계서 작성" description="3분 작성 UX를 가정한 더미 작성 화면입니다. 사람 평가가 아니라 공간과 생활 경험을 남깁니다.">
      <Card>
        <div className="flex flex-wrap gap-2">{allowedHandoverItems.map((item) => <span key={item} className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-forest">{item}</span>)}</div>
        <textarea className="mt-5 min-h-40 w-full rounded-2xl border border-forest/15 p-4" placeholder="다음 입주자가 알면 좋은 생활 팁을 작성하세요." />
        <Button href="/handovers/demo" className="mt-5">AI 검수 요청</Button>
      </Card>
    </AppShell>
  );
}
