"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatWon } from "@/lib/currency";

type QuoteOption = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
};

export function ServiceRequestQuoteOption({
  requestId,
  quote,
  selected,
  selectable,
}: {
  requestId: string;
  quote: QuoteOption;
  selected: boolean;
  selectable: boolean;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect() {
    setSelecting(true);
    setError(null);
    try {
      const res = await fetch(`/api/my/service-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteId: quote.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "선택에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSelecting(false);
    }
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        selected ? "border-forest bg-forest/10" : "border-forest/10 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-forest">
            {quote.title} · {formatWon(quote.amount)}원
          </p>
          {quote.description && (
            <p className="mt-1 whitespace-pre-wrap text-ink/65">{quote.description}</p>
          )}
        </div>
        {selected ? (
          <span className="shrink-0 rounded-full bg-forest px-3 py-1 text-xs font-bold text-white">
            선택한 견적
          </span>
        ) : (
          selectable && (
            <button
              type="button"
              onClick={handleSelect}
              disabled={selecting}
              className="shrink-0 rounded-full border border-forest/20 px-3 py-1.5 text-xs font-bold text-forest hover:bg-cream disabled:opacity-50"
            >
              {selecting ? "선택 중..." : "이 견적 선택"}
            </button>
          )
        )}
      </div>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
