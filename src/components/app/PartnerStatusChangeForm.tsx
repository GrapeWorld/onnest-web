"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  serviceRequestStatuses,
  serviceRequestCancelledStatus,
  type ServiceRequestStatus,
} from "@/data/serviceRequests";

const ACCEPTED_STATUS: ServiceRequestStatus = "확인 중";

export function PartnerStatusChangeForm({
  requestId,
  currentStatus,
}: {
  requestId: string;
  currentStatus: ServiceRequestStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<ServiceRequestStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextStatus: ServiceRequestStatus, nextReason: string) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/service-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, reason: nextReason || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    save(status, reason);
  }

  return (
    <div className="grid gap-3">
      {currentStatus === "신규" && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => save(ACCEPTED_STATUS, "")}
            disabled={saving}
            className="rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
          >
            요청 수락
          </button>
          <button
            type="button"
            onClick={() => setStatus(serviceRequestCancelledStatus)}
            disabled={saving}
            className="rounded-full border border-red-200 px-5 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            요청 거절
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-3">
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-forest">진행 상태</label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as ServiceRequestStatus)}
            disabled={saving}
            className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
          >
            {serviceRequestStatuses.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        {status === serviceRequestCancelledStatus && (
          <div className="grid gap-1">
            <label className="text-sm font-semibold text-forest">
              {status === currentStatus ? "취소 사유" : "거절/취소 사유 (필수)"}
            </label>
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={saving}
              rows={3}
              placeholder="예: 요청 지역이 서비스 가능 범위 밖입니다."
              className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
            />
          </div>
        )}

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
        >
          {saving ? "저장 중..." : "상태 저장"}
        </button>
      </form>
    </div>
  );
}
