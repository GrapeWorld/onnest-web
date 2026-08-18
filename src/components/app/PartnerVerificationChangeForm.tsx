"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  partnerVerificationStatuses,
  partnerVerificationStatusLabels,
  isVerificationReasonRequired,
  type PartnerVerificationStatus,
} from "@/data/partnerVerification";

export function PartnerVerificationChangeForm({
  partnerId,
  currentStatus,
}: {
  partnerId: string;
  currentStatus: PartnerVerificationStatus;
}) {
  const router = useRouter();
  const [toStatus, setToStatus] = useState<PartnerVerificationStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (toStatus === currentStatus) {
      setError("현재와 다른 상태를 선택해주세요.");
      return;
    }
    if (isVerificationReasonRequired(toStatus) && !reason.trim()) {
      setError("반려·이용 중지는 사유를 입력해야 합니다.");
      return;
    }
    if (
      !window.confirm(
        `${partnerVerificationStatusLabels[currentStatus]} → ${partnerVerificationStatusLabels[toStatus]}(으)로 변경할까요?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/partners/${partnerId}/verification`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, reason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "상태 변경에 실패했습니다.");
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
    <form onSubmit={handleSubmit} className="grid min-w-0 gap-3">
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">검증 상태</label>
        <select
          value={toStatus}
          onChange={(event) => setToStatus(event.target.value as PartnerVerificationStatus)}
          disabled={saving}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
        >
          {partnerVerificationStatuses.map((status) => (
            <option key={status} value={status}>
              {partnerVerificationStatusLabels[status]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">
          사유 {isVerificationReasonRequired(toStatus) ? "(필수)" : "(선택)"}
        </label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          rows={2}
          placeholder="예: 사업자등록증 미제출"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
        />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "변경 중..." : "검증 상태 변경"}
      </button>
    </form>
  );
}
