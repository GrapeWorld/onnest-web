"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { serviceTypes, type ServiceType } from "@/data/serviceRequests";

export function PartnerEditForm({
  partnerId,
  name,
  serviceType,
  contactName,
  contactPhone,
  adminMemo,
  businessRegistrationNumber,
  bankName,
  bankAccountHolder,
  bankAccountNumber,
  assignedCount,
}: {
  partnerId: string;
  name: string;
  serviceType: string;
  contactName: string | null;
  contactPhone: string | null;
  adminMemo: string | null;
  businessRegistrationNumber: string | null;
  bankName: string | null;
  bankAccountHolder: string | null;
  bankAccountNumber: string | null;
  assignedCount: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [nameValue, setNameValue] = useState(name);
  const [serviceTypeValue, setServiceTypeValue] = useState<ServiceType>(
    serviceType as ServiceType,
  );
  const [contactNameValue, setContactNameValue] = useState(contactName ?? "");
  const [contactPhoneValue, setContactPhoneValue] = useState(contactPhone ?? "");
  const [memoValue, setMemoValue] = useState(adminMemo ?? "");
  const [bizNumberValue, setBizNumberValue] = useState(businessRegistrationNumber ?? "");
  const [bankNameValue, setBankNameValue] = useState(bankName ?? "");
  const [bankHolderValue, setBankHolderValue] = useState(bankAccountHolder ?? "");
  const [bankAccountValue, setBankAccountValue] = useState(bankAccountNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceTypeLocked = assignedCount > 0;

  function resetDraft() {
    setNameValue(name);
    setServiceTypeValue(serviceType as ServiceType);
    setContactNameValue(contactName ?? "");
    setContactPhoneValue(contactPhone ?? "");
    setMemoValue(adminMemo ?? "");
    setBizNumberValue(businessRegistrationNumber ?? "");
    setBankNameValue(bankName ?? "");
    setBankHolderValue(bankAccountHolder ?? "");
    setBankAccountValue(bankAccountNumber ?? "");
  }

  async function handleSave() {
    if (!nameValue.trim()) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/partners/${partnerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameValue,
          serviceType: serviceTypeValue,
          contactName: contactNameValue,
          contactPhone: contactPhoneValue,
          adminMemo: memoValue,
          businessRegistrationNumber: bizNumberValue,
          bankName: bankNameValue,
          bankAccountHolder: bankHolderValue,
          bankAccountNumber: bankAccountValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "수정에 실패했습니다.");
        return;
      }

      setEditing(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-forest">{name}</p>
          <button
            type="button"
            onClick={() => {
              resetDraft();
              setEditing(true);
            }}
            className="text-xs font-semibold text-forest hover:underline"
          >
            수정
          </button>
        </div>
        <p className="mt-1 text-sm text-ink/60">
          {contactName ?? "담당자 미등록"}
          {contactPhone && ` · ${contactPhone}`}
        </p>
        {adminMemo && <p className="mt-1 text-xs text-ink/50">{adminMemo}</p>}
        <p className="mt-1 text-xs text-ink/40">
          정산정보 {businessRegistrationNumber || bankAccountNumber ? "등록됨" : "미등록"}
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <input
        value={nameValue}
        onChange={(event) => setNameValue(event.target.value)}
        disabled={saving}
        placeholder="업체명"
        className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <div>
        <select
          value={serviceTypeValue}
          onChange={(event) => setServiceTypeValue(event.target.value as ServiceType)}
          disabled={saving || serviceTypeLocked}
          className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
        >
          {serviceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {serviceTypeLocked && (
          <p className="mt-1 text-xs text-ink/45">
            배정된 신청이 있어 서비스 유형을 변경할 수 없습니다.
          </p>
        )}
      </div>
      <input
        value={contactNameValue}
        onChange={(event) => setContactNameValue(event.target.value)}
        disabled={saving}
        placeholder="담당자 (선택)"
        className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <input
        value={contactPhoneValue}
        onChange={(event) => setContactPhoneValue(event.target.value)}
        disabled={saving}
        placeholder="연락처 (선택)"
        className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <textarea
        value={memoValue}
        onChange={(event) => setMemoValue(event.target.value)}
        disabled={saving}
        rows={2}
        placeholder="내부 메모 (선택)"
        className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
      />
      <div className="mt-1 rounded-xl bg-cream/60 p-3">
        <p className="mb-2 text-xs font-bold text-forest">
          정산정보 (선택, 관리자만 볼 수 있습니다)
        </p>
        <div className="grid gap-2">
          <input
            value={bizNumberValue}
            onChange={(event) => setBizNumberValue(event.target.value)}
            disabled={saving}
            placeholder="사업자등록번호"
            className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
          />
          <input
            value={bankNameValue}
            onChange={(event) => setBankNameValue(event.target.value)}
            disabled={saving}
            placeholder="은행명"
            className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
          />
          <input
            value={bankHolderValue}
            onChange={(event) => setBankHolderValue(event.target.value)}
            disabled={saving}
            placeholder="예금주"
            className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
          />
          <input
            value={bankAccountValue}
            onChange={(event) => setBankAccountValue(event.target.value)}
            disabled={saving}
            placeholder="계좌번호"
            className="rounded-xl border border-forest/15 bg-white px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
          />
        </div>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !nameValue.trim()}
          className="rounded-full bg-forest px-4 py-1.5 text-xs font-bold text-white hover:bg-forest/90 disabled:opacity-60"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          disabled={saving}
          className="rounded-full border border-forest/15 px-4 py-1.5 text-xs font-semibold text-forest/70 hover:bg-cream"
        >
          취소
        </button>
      </div>
    </div>
  );
}
