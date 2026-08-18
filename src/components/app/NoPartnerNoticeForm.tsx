"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/dates";

export function NoPartnerNoticeForm({
  requestId,
  alreadySentAt,
}: {
  requestId: string;
  alreadySentAt: Date | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      setError("내부 사유를 입력해주세요.");
      return;
    }
    if (
      !window.confirm(
        "고객에게 \"연결이 어려워 확인 중\"이라는 안내 메일을 보낼까요? (내부 사유는 고객에게 노출되지 않습니다)",
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/service-requests/${requestId}/no-partner-notice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "안내 발송에 실패했습니다.");
        return;
      }
      setReason("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (alreadySentAt) {
    return (
      <p className="text-xs font-semibold text-amber-800">
        연결 어려움 안내 발송됨 · {formatDate(alreadySentAt)}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="justify-self-start text-xs font-semibold text-forest hover:underline"
      >
        연결 어려움 안내 보내기
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid min-w-0 gap-2 rounded-2xl bg-amber-50 p-3">
      <label className="grid min-w-0 gap-1 text-xs font-semibold text-forest">
        내부 사유 (고객에게는 노출되지 않음)
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          rows={2}
          placeholder="예: 해당 지역 취급 업체 없음"
          className="box-border w-full min-w-0 max-w-full rounded-xl border border-forest/15 px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
        />
      </label>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-forest px-4 py-1.5 text-xs font-bold text-white hover:bg-forest/90 disabled:opacity-60"
        >
          {saving ? "발송 중..." : "안내 발송"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={saving}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-forest ring-1 ring-forest/15"
        >
          취소
        </button>
      </div>
    </form>
  );
}
