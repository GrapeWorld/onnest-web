"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerQuoteForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim() || !amount) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/partner/service-requests/${requestId}/quotes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          amount: Number(amount),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "견적 등록에 실패했습니다.");
        return;
      }
      setTitle("");
      setAmount("");
      setDescription("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <input
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        disabled={saving}
        placeholder="견적 이름 (예: 기본형)"
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <input
        type="number"
        min={1}
        max={1_000_000_000}
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        disabled={saving}
        placeholder="금액 (원)"
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        disabled={saving}
        rows={2}
        placeholder="포함 사항 등 설명 (선택)"
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving || !title.trim() || !amount}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "등록 중..." : "견적 등록"}
      </button>
    </form>
  );
}
