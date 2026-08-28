"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { DateField } from "@/components/ui/DateField";
import {
  serviceTypes,
  serviceDescriptions,
  serviceRequestProcessingNotice,
  serviceRequestScopeNotice,
} from "@/data/serviceRequests";

const fieldClass =
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest";

export function ServiceRequestForm({
  projectId,
  defaultRegion,
  defaultName,
  defaultPhone,
}: {
  projectId: string;
  defaultRegion: string;
  defaultName: string;
  defaultPhone: string;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [preferredDate, setPreferredDate] = useState("");
  const [region, setRegion] = useState(defaultRegion);
  const [message, setMessage] = useState("");
  const [contactName, setContactName] = useState(defaultName);
  const [contactPhone, setContactPhone] = useState(defaultPhone);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<number | null>(null);

  function toggle(type: string) {
    setCreated(null);
    setSelected((prev) =>
      prev.includes(type)
        ? prev.filter((item) => item !== type)
        : [...prev, type],
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setCreated(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/projects/${projectId}/service-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceTypes: selected,
          preferredDate,
          region,
          message,
          contactName,
          contactPhone,
          agreePrivacy,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "신청에 실패했습니다.");
        return;
      }

      setCreated(data.created);
      setSelected([]);
      setPreferredDate("");
      setMessage("");
      setAgreePrivacy(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 min-w-0" noValidate>
      <Card>
        <h2 className="text-xl font-black text-forest">필요한 서비스 선택</h2>
        <p className="mt-2 text-sm text-ink/60">
          여러 개를 함께 선택할 수 있습니다. 유형별로 각각 접수됩니다.
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {serviceTypes.map((type) => {
            const on = selected.includes(type);
            return (
              <label
                key={type}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-4 transition ${
                  on ? "bg-mint" : "bg-cream hover:bg-mint/50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(type)}
                  className="mt-1 h-4 w-4 shrink-0 accent-[#123C35]"
                />
                <span>
                  <span className="block text-sm font-bold text-forest">
                    {type}
                  </span>
                  <span className="mt-1 block text-xs leading-6 text-ink/60">
                    {serviceDescriptions[type]}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-forest">신청 정보</h2>
        <div className="mt-5 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
              희망일 <span className="font-normal text-ink/50">선택 입력</span>
              <DateField
                value={preferredDate}
                onChange={setPreferredDate}
                className={fieldClass}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
              지역
              <input
                required
                value={region}
                onChange={(event) => setRegion(event.target.value)}
                maxLength={100}
                className={fieldClass}
                placeholder="예: 남양주시 별내동"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
              연락받을 이름
              <input
                required
                value={contactName}
                onChange={(event) => setContactName(event.target.value)}
                maxLength={50}
                className={fieldClass}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
              연락처
              <input
                required
                value={contactPhone}
                onChange={(event) => setContactPhone(event.target.value)}
                className={fieldClass}
                placeholder="010-1234-5678"
              />
            </label>
          </div>

          <label className="grid gap-2 text-sm font-semibold text-forest min-w-0">
            요청 내용 <span className="font-normal text-ink/50">선택 입력</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={500}
              className={`${fieldClass} min-h-28`}
              placeholder="예: 엘리베이터 사용이 오후에만 가능합니다. 짐은 원룸 기준입니다."
            />
          </label>
        </div>
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
        >
          {error}
        </p>
      )}

      {created !== null && (
        <div
          role="status"
          className="rounded-2xl bg-mint p-5 text-sm leading-7 text-forest"
        >
          <p className="text-base font-black">
            서비스 신청 {created}건이 접수되었습니다.
          </p>
          <p className="mt-1 text-ink/70">{serviceRequestProcessingNotice}</p>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-cream px-4 py-4">
        <input
          type="checkbox"
          checked={agreePrivacy}
          onChange={(event) => setAgreePrivacy(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#123C35]"
        />
        <span className="text-sm leading-7 text-ink/70">
          입력한 이름과 연락처를 파트너 연결 목적으로 제공하는 데 동의합니다.
          자세한 내용은{" "}
          <Link
            href="/privacy"
            target="_blank"
            className="font-semibold text-forest underline"
          >
            개인정보처리방침
          </Link>
          을 확인해주세요.
        </span>
      </label>

      <button
        type="submit"
        disabled={saving || selected.length === 0 || !agreePrivacy}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
      >
        {saving
          ? "접수 중..."
          : selected.length === 0
            ? "서비스를 선택해주세요"
            : !agreePrivacy
              ? "연락처 제공에 동의해주세요"
              : `${selected.length}개 서비스 신청하기`}
      </button>

      <p className="text-xs leading-6 text-ink/55">
        {serviceRequestScopeNotice} 견적·계약·A/S는 파트너 정책을 따릅니다.
      </p>
    </form>
  );
}
