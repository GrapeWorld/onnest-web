"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  allowedHandoverItems,
  restrictedHandoverItems,
} from "@/data/handoverRules";

export function HandoverForm({
  projectId,
  initialSummary,
  initialNotes,
}: {
  projectId: string;
  initialSummary: string;
  /** label -> note */
  initialNotes: Record<string, string>;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/handover`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary,
          items: allowedHandoverItems.map((label) => ({
            label,
            note: notes[label] ?? "",
          })),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.push(`/projects/${projectId}/handover`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5">
      <Card>
        <h2 className="text-xl font-black text-forest">생활 정보 요약</h2>
        <p className="mt-2 text-sm text-ink/60">
          다음 사용자가 알면 좋은 내용을 자유롭게 적어주세요.
        </p>
        <textarea
          required
          value={summary}
          onChange={(event) => setSummary(event.target.value)}
          maxLength={2000}
          className="mt-4 min-h-40 w-full rounded-2xl border border-forest/15 p-4 text-base outline-none focus:border-forest"
          placeholder="예: 오전에 볕이 잘 들고, 겨울에는 북쪽 창에 결로가 생겨 환기가 필요합니다."
        />
        <p className="mt-2 text-right text-xs text-ink/45">
          {summary.length}/2000
        </p>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-forest">항목별 메모</h2>
        <p className="mt-2 text-sm text-ink/60">
          필요한 항목만 채우면 됩니다. 비워둔 항목은 저장되지 않습니다.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {allowedHandoverItems.map((label) => (
            <label
              key={label}
              className="grid gap-2 text-sm font-semibold text-forest"
            >
              {label}
              <input
                value={notes[label] ?? ""}
                onChange={(event) =>
                  setNotes((prev) => ({ ...prev, [label]: event.target.value }))
                }
                maxLength={500}
                className="rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest"
                placeholder={`${label}에 대해 알아두면 좋은 점`}
              />
            </label>
          ))}
        </div>
      </Card>

      <Card className="bg-cream/60">
        <h2 className="text-base font-black text-forest">
          이런 내용은 담을 수 없습니다
        </h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {restrictedHandoverItems.map((item) => (
            <span
              key={item}
              className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink/70"
            >
              {item}
            </span>
          ))}
        </div>
        <p className="mt-3 text-sm leading-7 text-ink/65">
          저장할 때 서버에서 한 번 더 확인합니다. 사람 평가나 개인정보 대신
          공간과 생활 경험을 남겨주세요.
        </p>
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {saving ? "저장 중..." : "생활 정보 저장"}
      </button>
    </form>
  );
}
