"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inquiryStatuses } from "@/data/inquiries";

export function InquiryStatusControl({
  inquiryId,
  status,
}: {
  inquiryId: string;
  status: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const nextStatus = event.target.value;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "상태 변경에 실패했습니다.");
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
    <div className="grid gap-1">
      <select
        value={status}
        onChange={handleChange}
        disabled={saving}
        aria-label="문의 상태 변경"
        className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        {inquiryStatuses.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
