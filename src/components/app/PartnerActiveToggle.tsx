"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function PartnerActiveToggle({
  partnerId,
  active,
}: {
  partnerId: string;
  active: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !active }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "변경에 실패했습니다.");
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
    <div className="grid gap-1 justify-items-end text-right">
      <button
        type="button"
        onClick={handleClick}
        disabled={saving}
        className={`rounded-full px-4 py-1.5 text-xs font-bold disabled:opacity-60 ${
          active
            ? "border border-forest/15 text-forest/70 hover:bg-cream"
            : "bg-forest text-white hover:bg-forest/90"
        }`}
      >
        {saving ? "처리 중..." : active ? "비활성화" : "재활성화"}
      </button>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
