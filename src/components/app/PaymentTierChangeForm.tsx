"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  paymentTiers,
  paymentTierLabels,
  type PaymentTier,
} from "@/data/paymentTier";

export function PaymentTierChangeForm({
  userId,
  currentTier,
}: {
  userId: string;
  currentTier: PaymentTier;
}) {
  const router = useRouter();
  const [toTier, setToTier] = useState<PaymentTier>(currentTier);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (toTier === currentTier) {
      setError("현재와 다른 등급을 선택해주세요.");
      return;
    }
    if (
      !window.confirm(
        `${paymentTierLabels[currentTier]} → ${paymentTierLabels[toTier]}(으)로 변경할까요?`,
      )
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}/payment-tier`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toTier, reason }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "결제 등급 변경에 실패했습니다.");
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
    <form onSubmit={handleSubmit} className="grid gap-3 min-w-0">
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">변경할 결제 등급</label>
        <select
          value={toTier}
          onChange={(event) => setToTier(event.target.value as PaymentTier)}
          disabled={saving}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
        >
          {paymentTiers.map((tier) => (
            <option key={tier} value={tier}>
              {paymentTierLabels[tier]}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">변경 사유 (필수)</label>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          rows={3}
          placeholder="예: 상담 후 Premium 결제 확인"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
        />
      </div>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "변경 중..." : "결제 등급 변경"}
      </button>
    </form>
  );
}
