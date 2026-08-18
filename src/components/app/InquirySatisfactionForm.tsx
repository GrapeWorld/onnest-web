"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InquirySatisfactionForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/my/inquiries/${inquiryId}/satisfaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "평가 제출에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 min-w-0">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            disabled={saving}
            aria-label={`${value}점`}
            className={`text-2xl ${value <= rating ? "text-forest" : "text-forest/20"} disabled:opacity-60`}
          >
            ★
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        disabled={saving}
        rows={2}
        placeholder="의견을 남겨주세요. (선택)"
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
      />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "제출 중..." : "평가 제출"}
      </button>
    </form>
  );
}
