"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { serviceTypes, type ServiceType } from "@/data/serviceRequests";

export function PartnerForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [serviceType, setServiceType] = useState<ServiceType>(serviceTypes[0]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, serviceType, contactName, contactPhone }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "업체 추가에 실패했습니다.");
        return;
      }

      setName("");
      setContactName("");
      setContactPhone("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_160px_1fr_1fr_auto]">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        disabled={saving}
        placeholder="업체명"
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <select
        value={serviceType}
        onChange={(event) => setServiceType(event.target.value as ServiceType)}
        disabled={saving}
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        {serviceTypes.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>
      <input
        value={contactName}
        onChange={(event) => setContactName(event.target.value)}
        disabled={saving}
        placeholder="담당자 (선택)"
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <input
        value={contactPhone}
        onChange={(event) => setContactPhone(event.target.value)}
        disabled={saving}
        placeholder="연락처 (선택)"
        className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="rounded-2xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "추가 중..." : "업체 추가"}
      </button>
      {error && (
        <p className="md:col-span-5 text-sm font-semibold text-red-600">{error}</p>
      )}
    </form>
  );
}
