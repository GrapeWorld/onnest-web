"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type StaffOption = { id: string; name: string; email: string };

export function PartnerStaffAssignForm({
  requestId,
  currentStaffId,
  staffOptions,
}: {
  requestId: string;
  currentStaffId: string | null;
  staffOptions: StaffOption[];
}) {
  const router = useRouter();
  const [staffId, setStaffId] = useState(currentStaffId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/partner/service-requests/${requestId}/staff`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ partnerStaffId: staffId || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
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
    <form onSubmit={handleSubmit} className="grid gap-2">
      <select
        value={staffId}
        onChange={(event) => setStaffId(event.target.value)}
        disabled={saving}
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        <option value="">미배정</option>
        {staffOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name} ({option.email})
          </option>
        ))}
      </select>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "담당 직원 저장"}
      </button>
    </form>
  );
}
