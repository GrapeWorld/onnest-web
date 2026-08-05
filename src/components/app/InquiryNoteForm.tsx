"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InquiryNoteForm({ inquiryId }: { inquiryId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "메모 작성에 실패했습니다.");
        return;
      }

      setBody("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        disabled={saving}
        rows={3}
        placeholder="이 문의에 대한 내부 메모를 남겨주세요. (문의자에게는 노출되지 않습니다)"
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving || !body.trim()}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "메모 추가"}
      </button>
    </form>
  );
}
