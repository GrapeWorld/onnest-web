import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  return (
    <AppShell title="로그인" description="실제 인증 API 연결 전, 온네스트 앱 진입 화면을 더미 폼으로 구성했습니다.">
      <div className="mx-auto max-w-md">
        <Card>
          <label className="grid gap-2 text-sm font-semibold text-forest">이메일<input className="rounded-2xl border border-forest/15 px-4 py-3" placeholder="hello@onnesthome.com" /></label>
          <label className="mt-4 grid gap-2 text-sm font-semibold text-forest">비밀번호<input type="password" className="rounded-2xl border border-forest/15 px-4 py-3" placeholder="비밀번호" /></label>
          <Button href="/my" className="mt-6 w-full">더미 로그인</Button>
        </Card>
      </div>
    </AppShell>
  );
}
