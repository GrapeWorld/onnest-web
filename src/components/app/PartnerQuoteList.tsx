"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatWon } from "@/lib/currency";

type QuoteRow = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  createdAt: string;
  createdByName: string | null;
};

export function PartnerQuoteList({
  requestId,
  quotes,
  selectedQuoteId,
  locked,
}: {
  requestId: string;
  quotes: QuoteRow[];
  selectedQuoteId: string | null;
  locked: boolean;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(quoteId: string) {
    if (!window.confirm("이 견적을 삭제할까요?")) return;

    setDeletingId(quoteId);
    setError(null);
    try {
      const res = await fetch(`/api/partner/service-requests/${requestId}/quotes/${quoteId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  if (quotes.length === 0) {
    return <p className="text-sm text-ink/55">아직 등록한 견적이 없습니다.</p>;
  }

  return (
    <div className="grid gap-2">
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <ul className="grid gap-2">
        {quotes.map((quote) => {
          const selected = quote.id === selectedQuoteId;
          return (
            <li
              key={quote.id}
              className={`rounded-2xl px-4 py-3 text-sm ${selected ? "bg-forest/10" : "bg-cream"}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="break-words font-semibold text-forest">
                    {quote.title} · {formatWon(quote.amount)}원
                    {selected && (
                      <span className="ml-2 rounded-full bg-forest px-2 py-0.5 text-xs font-bold text-white">
                        고객 선택
                      </span>
                    )}
                  </p>
                  {quote.description && (
                    <p className="mt-1 whitespace-pre-wrap text-ink/65">{quote.description}</p>
                  )}
                  <p className="mt-1 text-xs text-ink/45">
                    {quote.createdByName ? `${quote.createdByName} · ` : ""}
                    {quote.createdAt}
                  </p>
                </div>
                {!locked && !selected && (
                  <button
                    type="button"
                    onClick={() => handleDelete(quote.id)}
                    disabled={deletingId === quote.id}
                    className="shrink-0 text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                  >
                    {deletingId === quote.id ? "삭제 중..." : "삭제"}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
