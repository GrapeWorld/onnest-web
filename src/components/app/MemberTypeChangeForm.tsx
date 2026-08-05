"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { memberTypeLabels, memberTypes, type MemberType } from "@/data/memberType";

type PartnerOption = {
  id: string;
  name: string;
  serviceType: string;
  active: boolean;
};

export function MemberTypeChangeForm({
  userId,
  currentType,
  currentPartnerId,
  partners,
}: {
  userId: string;
  currentType: MemberType;
  currentPartnerId: string | null;
  partners: PartnerOption[];
}) {
  const router = useRouter();
  const [type, setType] = useState<MemberType>(currentType);
  const [partnerId, setPartnerId] = useState(currentPartnerId ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const noChange = type === currentType && partnerId === (currentPartnerId ?? "");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (noChange) {
      setError("현재와 다른 값을 선택해주세요.");
      return;
    }
    if (type === "PARTNER" && !partnerId) {
      setError("연결할 업체를 선택해주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/member-type`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberType: type,
          partnerId: type === "PARTNER" ? partnerId : null,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "회원 구분 변경에 실패했습니다.");
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
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">회원 구분</label>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as MemberType)}
          disabled={saving}
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
        >
          {memberTypes.map((option) => (
            <option key={option} value={option}>
              {memberTypeLabels[option]}
            </option>
          ))}
        </select>
      </div>

      {type === "PARTNER" && (
        <div className="grid gap-1">
          <label className="text-sm font-semibold text-forest">연결할 업체</label>
          <select
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
            disabled={saving}
            className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
          >
            <option value="">업체를 선택해주세요</option>
            {partners.map((partner) => {
              const blocked = !partner.active && partner.id !== currentPartnerId;
              return (
                <option key={partner.id} value={partner.id} disabled={blocked}>
                  {partner.name} ({partner.serviceType})
                  {!partner.active && (blocked ? " — 비활성, 신규 연결 불가" : " — 비활성")}
                </option>
              );
            })}
          </select>
        </div>
      )}

      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">변경 사유 (필수)</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          rows={3}
          placeholder="예: 이사업체와의 제휴 계약으로 업체 계정 전환"
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
        />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "변경 중..." : "회원 구분 변경"}
      </button>
    </form>
  );
}
