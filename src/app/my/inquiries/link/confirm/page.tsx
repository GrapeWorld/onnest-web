"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";

function InquiryLinkConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<"loading" | "success" | "error">(() =>
    token ? "loading" : "error",
  );
  const [error, setError] = useState<string | null>(() =>
    token ? null : "유효하지 않은 링크입니다.",
  );
  const [inquiryId, setInquiryId] = useState<string | null>(null);

  useEffect(() => {
    // token이 없을 때의 에러 상태는 이미 초기값으로 반영돼 있다 — effect
    // 안에서 동기적으로 setState를 호출하지 않기 위해서다.
    if (!token) return;

    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/my/inquiries/link/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;

        if (!res.ok) {
          setState("error");
          setError(data.error ?? "연결에 실패했습니다.");
          return;
        }

        setInquiryId(data.inquiryId);
        setState("success");
      } catch {
        if (!cancelled) {
          setState("error");
          setError("네트워크 오류가 발생했습니다.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <Card className="p-10 text-center">
      {state === "loading" && <p className="text-sm text-ink/60">확인하는 중...</p>}
      {state === "success" && (
        <>
          <p className="font-semibold text-forest">문의가 계정에 연결됐습니다.</p>
          <Link
            href={inquiryId ? `/my/inquiries/${inquiryId}` : "/my/inquiries"}
            className="mt-4 inline-block rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90"
          >
            내 문의 보기
          </Link>
        </>
      )}
      {state === "error" && (
        <>
          <p className="font-semibold text-red-700">{error}</p>
          <Link
            href="/my/inquiries"
            className="mt-4 inline-block rounded-full border border-forest/15 px-5 py-2.5 text-sm font-semibold text-forest hover:bg-cream"
          >
            내 문의 목록으로
          </Link>
        </>
      )}
    </Card>
  );
}

export default function InquiryLinkConfirmPage() {
  return (
    <AppShell title="문의 연결 확인" description="비회원 문의를 내 계정에 연결합니다." showNav={false}>
      <div className="mx-auto max-w-md">
        <Suspense fallback={<Card className="p-10 text-center text-sm text-ink/60">불러오는 중...</Card>}>
          <InquiryLinkConfirmContent />
        </Suspense>
      </div>
    </AppShell>
  );
}
