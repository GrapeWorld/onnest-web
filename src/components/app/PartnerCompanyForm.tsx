"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerCompanyForm({
  name,
  contactName,
  contactPhone,
  companyDescription,
}: {
  name: string;
  contactName: string | null;
  contactPhone: string | null;
  companyDescription: string | null;
}) {
  const router = useRouter();
  const [nameValue, setNameValue] = useState(name);
  const [contactNameValue, setContactNameValue] = useState(contactName ?? "");
  const [contactPhoneValue, setContactPhoneValue] = useState(contactPhone ?? "");
  const [memoValue, setMemoValue] = useState(companyDescription ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!nameValue.trim()) return;

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/partner/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameValue,
          contactName: contactNameValue,
          contactPhone: contactPhoneValue,
          companyDescription: memoValue,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 min-w-0">
      <label className="grid gap-1 text-sm font-semibold text-forest min-w-0">
        업체명
        <input
          value={nameValue}
          onChange={(event) => setNameValue(event.target.value)}
          disabled={saving}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal outline-none focus:border-forest disabled:opacity-60"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-forest min-w-0">
        대표 담당자
        <input
          value={contactNameValue}
          onChange={(event) => setContactNameValue(event.target.value)}
          disabled={saving}
          placeholder="선택"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal outline-none focus:border-forest disabled:opacity-60"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-forest min-w-0">
        대표 연락처
        <input
          value={contactPhoneValue}
          onChange={(event) => setContactPhoneValue(event.target.value)}
          disabled={saving}
          placeholder="선택"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal outline-none focus:border-forest disabled:opacity-60"
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold text-forest min-w-0">
        업체 소개
        <textarea
          value={memoValue}
          onChange={(event) => setMemoValue(event.target.value)}
          disabled={saving}
          rows={3}
          placeholder="선택"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal outline-none focus:border-forest disabled:opacity-60"
        />
      </label>
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      {saved && <p className="text-sm font-semibold text-forest">저장했습니다.</p>}
      <button
        type="submit"
        disabled={saving || !nameValue.trim()}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
