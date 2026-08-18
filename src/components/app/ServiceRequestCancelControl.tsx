"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * 배정 전(업체 없음)에는 사유가 선택, 배정 후에는 필수다 — 서버도 같은
 * 규칙을 강제한다. alreadyRequested는 취소 요청 제출 직후 router.refresh()로
 * 서버 데이터가 다시 내려온 뒤(=cancelRequestedAt이 이미 채워진 채로 이
 * 컴포넌트가 다시 마운트된 경우)에도 "취소 요청을 보냈습니다" 문구가
 * 사라지지 않도록 로컬 done 상태와 별개로 둔 값이다.
 */
export function ServiceRequestCancelControl({
  requestId,
  reasonRequired,
  alreadyRequested = false,
}: {
  requestId: string;
  reasonRequired: boolean;
  alreadyRequested?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"cancelled" | "requested" | null>(null);

  async function handleCancel() {
    if (reasonRequired && !reason.trim()) {
      setError("취소 사유를 입력해주세요.");
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/my/service-requests/${requestId}/cancel`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? "취소 처리에 실패했습니다.");
        return;
      }

      setDone(data.mode);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (done === "cancelled") {
    return <p className="text-sm font-semibold text-ink/60">신청이 취소되었습니다.</p>;
  }
  if (done === "requested" || alreadyRequested) {
    return <p className="text-sm font-semibold text-ink/60">취소 요청을 보냈습니다. 확인 후 연락드리겠습니다.</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50"
      >
        신청 취소
      </button>
    );
  }

  return (
    <div className="grid min-w-0 gap-2 rounded-2xl border border-red-200 bg-red-50/50 p-4">
      <label className="grid min-w-0 gap-1 text-sm font-semibold text-forest">
        취소 사유 {reasonRequired ? "(필수)" : "(선택)"}
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          rows={2}
          placeholder="취소하시는 이유를 알려주시면 도움이 됩니다."
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 bg-white px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
        />
      </label>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCancel}
          disabled={saving}
          className="min-h-11 rounded-full bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "처리 중..." : "취소 확정"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={saving}
          className="min-h-11 rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-forest hover:border-forest/40 disabled:opacity-60"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
