"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { propertyVisitChecklistItems } from "@/data/candidateProperty";

export function PropertyVisitChecklist({
  candidateId,
  checkedLabels,
}: {
  candidateId: string;
  checkedLabels: string[];
}) {
  const router = useRouter();
  const [checked, setChecked] = useState<Set<string>>(new Set(checkedLabels));
  const [savingLabel, setSavingLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(label: string) {
    const nextChecked = !checked.has(label);
    setSavingLabel(label);
    setError(null);
    // 낙관적으로 먼저 반영하고, 실패하면 되돌린다.
    setChecked((prev) => {
      const next = new Set(prev);
      if (nextChecked) next.add(label);
      else next.delete(label);
      return next;
    });

    try {
      const res = await fetch(`/api/my/candidate-properties/${candidateId}/visit-checklist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, checked: nextChecked }),
      });
      if (!res.ok) {
        setChecked((prev) => {
          const next = new Set(prev);
          if (nextChecked) next.delete(label);
          else next.add(label);
          return next;
        });
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setChecked((prev) => {
        const next = new Set(prev);
        if (nextChecked) next.delete(label);
        else next.add(label);
        return next;
      });
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSavingLabel(null);
    }
  }

  return (
    <div className="grid min-w-0 gap-3">
      <p className="text-xs text-ink/50">
        방문 시 참고용 체크리스트입니다. 법률적·부동산 전문 판단을 대신하지 않습니다 — 계약 전 중요한 사항은 반드시 전문가와 별도로 확인해주세요.
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {propertyVisitChecklistItems.map((label) => (
          <li key={label}>
            <label className="flex min-w-0 items-center gap-2 rounded-2xl bg-cream/70 px-4 py-3 text-sm text-forest">
              <input
                type="checkbox"
                checked={checked.has(label)}
                disabled={savingLabel === label}
                onChange={() => toggle(label)}
                className="h-4 w-4 shrink-0 rounded border-forest/30 text-forest focus:ring-forest"
              />
              <span className="min-w-0 break-words">{label}</span>
            </label>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
    </div>
  );
}
