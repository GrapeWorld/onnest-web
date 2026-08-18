"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inquiryStatuses } from "@/data/inquiries";

/** 목록 카드의 빠른 상태·다음 액션 변경. 담당자 배정·메모·연락 기록은 상세 페이지에서 관리한다. */
export function InquiryUpdateForm({
  inquiryId,
  status,
  nextAction,
}: {
  inquiryId: string;
  status: string;
  nextAction: string | null;
}) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState(status);
  const [nextActionValue, setNextActionValue] = useState(nextAction ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusValue,
          nextAction: nextActionValue,
        }),
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
    <form onSubmit={handleSubmit} className="grid gap-2 min-w-0">
      <select
        value={statusValue}
        onChange={(event) => setStatusValue(event.target.value)}
        disabled={saving}
        aria-label="문의 상태 변경"
        className="box-border w-full min-w-0 max-w-full rounded-full border border-forest/15 bg-white px-4 py-2 text-base font-semibold text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        {inquiryStatuses.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <input
        value={nextActionValue}
        onChange={(event) => setNextActionValue(event.target.value)}
        disabled={saving}
        placeholder="다음 액션 (예: 내일 오전 전화 상담)"
        aria-label="다음 액션"
        className="box-border w-full min-w-0 max-w-full rounded-full border border-forest/15 bg-white px-4 py-2 text-base outline-none focus:border-forest disabled:opacity-60"
      />

      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
