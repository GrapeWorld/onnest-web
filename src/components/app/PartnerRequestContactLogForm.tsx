"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { contactMethods, type ContactMethod } from "@/data/inquiryActivity";

function nowForDateTimeLocal() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export function PartnerRequestContactLogForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [method, setMethod] = useState<ContactMethod>(contactMethods[0]);
  const [result, setResult] = useState("");
  const [contactedAt, setContactedAt] = useState(nowForDateTimeLocal());
  const [followUp, setFollowUp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!result.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/partner/service-requests/${requestId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method,
          result,
          contactedAt: new Date(contactedAt).toISOString(),
          followUp,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "연락 기록 저장에 실패했습니다.");
        return;
      }
      setResult("");
      setFollowUp("");
      setContactedAt(nowForDateTimeLocal());
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 min-w-0">
      <div className="grid gap-2 sm:grid-cols-2">
        <select
          value={method}
          onChange={(event) => setMethod(event.target.value as ContactMethod)}
          disabled={saving}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
        >
          {contactMethods.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          value={contactedAt}
          onChange={(event) => setContactedAt(event.target.value)}
          disabled={saving}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
        />
      </div>
      <textarea
        value={result}
        onChange={(event) => setResult(event.target.value)}
        disabled={saving}
        rows={2}
        placeholder="연락 결과 (예: 통화 연결, 견적 안내 완료)"
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
      />
      <input
        value={followUp}
        onChange={(event) => setFollowUp(event.target.value)}
        disabled={saving}
        placeholder="후속 조치 (선택)"
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
      />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving || !result.trim()}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "연락 기록 추가"}
      </button>
    </form>
  );
}
