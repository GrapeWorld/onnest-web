"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { stepStatuses } from "@/data/projectSteps";

export function StepStatusControl({
  projectId,
  slug,
  status,
}: {
  projectId: string;
  slug: string;
  status: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(next: string) {
    if (next === status) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/steps/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "상태 저장에 실패했습니다.");
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
    <div className="rounded-2xl bg-white/70 p-4">
      <p className="text-sm font-bold text-forest">이 단계 진행 상태</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {stepStatuses.map((option) => {
          const active = option === status;
          return (
            <button
              key={option}
              type="button"
              disabled={saving}
              aria-pressed={active}
              onClick={() => handleChange(option)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-bold transition disabled:opacity-60 ${
                active
                  ? "bg-forest text-white shadow-soft"
                  : "border border-forest/15 bg-white text-forest hover:border-forest/40"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}
