import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function NotFound() {
  return (
    <AppShell
      title="페이지를 찾을 수 없습니다"
      description="주소가 바뀌었거나, 삭제됐거나, 접근 권한이 없는 페이지일 수 있습니다."
    >
      <Card className="p-10 text-center">
        <p className="font-semibold text-forest">찾으시는 페이지가 없습니다.</p>
        <p className="mt-2 text-sm text-ink/60">
          주소를 다시 확인하시거나, 아래에서 다른 곳으로 이동해주세요.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-navy"
          >
            홈으로
          </Link>
          <Link
            href="/my"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
          >
            내 프로젝트 보기
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
