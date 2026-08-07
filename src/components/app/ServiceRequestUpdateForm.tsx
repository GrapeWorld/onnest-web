"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { serviceRequestStatuses } from "@/data/serviceRequests";

const UNASSIGNED_PARTNER = "";

export function ServiceRequestUpdateForm({
  requestId,
  status,
  owner,
  partnerId,
  partnerOptions,
  currentAdminEmail,
  privacyAgreed,
}: {
  requestId: string;
  status: string;
  owner: string | null;
  partnerId: string | null;
  partnerOptions: { id: string; name: string }[];
  currentAdminEmail: string;
  privacyAgreed: boolean;
}) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState(status);
  const [ownerValue, setOwnerValue] = useState(owner ?? "");
  const [partnerValue, setPartnerValue] = useState(partnerId ?? UNASSIGNED_PARTNER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/service-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusValue,
          owner: ownerValue,
          partnerId: partnerValue || null,
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
    <form onSubmit={handleSubmit} className="grid gap-2">
      <select
        value={statusValue}
        onChange={(event) => setStatusValue(event.target.value)}
        disabled={saving}
        aria-label="서비스 신청 상태 변경"
        className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        {serviceRequestStatuses.map((option) => (
          <option key={option}>{option}</option>
        ))}
      </select>

      <select
        value={partnerValue}
        onChange={(event) => setPartnerValue(event.target.value)}
        disabled={saving || !privacyAgreed}
        aria-label="담당 업체 배정"
        className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        <option value={UNASSIGNED_PARTNER}>미배정</option>
        {partnerOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      {!privacyAgreed && (
        <p className="text-xs text-ink/45">
          고객이 개인정보 제공에 동의하지 않아 업체 배정이 막혀 있습니다.
        </p>
      )}

      <div className="flex gap-2">
        <input
          value={ownerValue}
          onChange={(event) => setOwnerValue(event.target.value)}
          disabled={saving}
          placeholder="담당자"
          aria-label="담당자"
          className="flex-1 rounded-full border border-forest/15 bg-white px-4 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => setOwnerValue(currentAdminEmail)}
          disabled={saving}
          className="whitespace-nowrap rounded-full border border-forest/15 px-3 py-2 text-xs font-semibold text-forest/70 hover:bg-cream disabled:opacity-60"
        >
          나에게 배정
        </button>
      </div>

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
