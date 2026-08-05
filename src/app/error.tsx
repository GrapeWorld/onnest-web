"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <AppShell
      title="문제가 발생했습니다"
      description="일시적인 오류일 수 있습니다. 다시 시도해도 계속되면 잠시 후 다시 이용해주세요."
    >
      <Card className="p-10 text-center">
        <p className="font-semibold text-forest">화면을 불러오지 못했습니다.</p>
        <p className="mt-2 text-sm text-ink/60">
          네트워크 상태를 확인하시거나 다시 시도해주세요.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft hover:bg-navy"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
          >
            홈으로
          </Link>
        </div>
      </Card>
    </AppShell>
  );
}
