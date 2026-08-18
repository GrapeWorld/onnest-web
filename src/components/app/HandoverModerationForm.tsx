"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  moderationStatuses,
  moderationStatusLabels,
  type ModerationStatus,
} from "@/data/handoverModeration";

export function HandoverModerationForm({
  handoverId,
  currentStatus,
}: {
  handoverId: string;
  currentStatus: ModerationStatus;
}) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState<ModerationStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (toStatus === currentStatus) {
      setError("현재와 다른 상태를 선택해주세요.");
      return;
    }
    if (
      !window.confirm(
        `${moderationStatusLabels[currentStatus]} → ${moderationStatusLabels[toStatus]}(으)로 처리할까요?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/handovers/${handoverId}/moderation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, reason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "처리에 실패했습니다.");
        return;
      }

      setReason("");
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
        value={toStatus}
        onChange={(event) => setToStatus(event.target.value as ModerationStatus)}
        disabled={saving}
        aria-label="검수 상태 변경"
        className="box-border w-full min-w-0 max-w-full rounded-full border border-forest/15 bg-white px-4 py-2 text-base font-semibold text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        {moderationStatuses.map((status) => (
          <option key={status} value={status}>
            {moderationStatusLabels[status]}
          </option>
        ))}
      </select>
      <textarea
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        disabled={saving}
        rows={2}
        placeholder="처리 사유 (필수, 수정 요청이면 작성자에게 그대로 표시됩니다)"
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 bg-white px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
      />
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "처리 중..." : "검수 처리"}
      </button>
    </form>
  );
}
