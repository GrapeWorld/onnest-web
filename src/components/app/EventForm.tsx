"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

// 입주 준비에서 자주 쓰는 일정. 눌러서 이름 칸을 채운다.
const presets = [
  "계약 당일",
  "잔금 지급",
  "전입신고",
  "확정일자",
  "입주청소",
  "이사",
  "인터넷 설치",
  "퇴거 시 생활 정보 남기기",
];

const fieldClass =
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest";

export function EventForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [memo, setMemo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, date, memo }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      setTitle("");
      setDate("");
      setMemo("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <h2 className="text-xl font-black text-forest">일정 추가</h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => setTitle(preset)}
            className="inline-flex items-center justify-center min-h-11 rounded-full bg-cream px-3 py-1.5 text-xs font-semibold text-forest hover:bg-mint"
          >
            {preset}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 min-w-0" noValidate>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
            일정 이름
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={100}
              className={fieldClass}
              placeholder="예: 전입신고"
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
            날짜
            <input
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className={fieldClass}
            />
          </label>
        </div>
        <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
          메모 <span className="font-normal text-ink/50">선택 입력</span>
          <input
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            maxLength={300}
            className={fieldClass}
            placeholder="예: 주민센터 방문, 신분증 지참"
          />
        </label>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        >
          {saving ? "추가 중..." : "일정 추가"}
        </button>
      </form>
    </Card>
  );
}
