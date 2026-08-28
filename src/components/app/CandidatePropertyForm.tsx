"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  candidatePropertyTransactionTypes,
  candidatePropertyStatuses,
  type CandidatePropertyTransactionType,
  type CandidatePropertyStatus,
} from "@/data/candidateProperty";
import { candidatePropertySchema } from "@/lib/candidatePropertySchema";
import { fieldClass, labelClass } from "./project-wizard/shared";
import { DateField } from "@/components/ui/DateField";

export type CandidatePropertyFormValues = {
  sourceUrl: string;
  title: string;
  address: string;
  transactionType: CandidatePropertyTransactionType | "";
  price: string;
  deposit: string;
  monthlyRent: string;
  area: string;
  roomCount: string;
  availableDate: string;
  memo: string;
  advantages: string;
  concerns: string;
  status: CandidatePropertyStatus;
};

export const emptyCandidatePropertyValues: CandidatePropertyFormValues = {
  sourceUrl: "",
  title: "",
  address: "",
  transactionType: "",
  price: "",
  deposit: "",
  monthlyRent: "",
  area: "",
  roomCount: "",
  availableDate: "",
  memo: "",
  advantages: "",
  concerns: "",
  status: "관심",
};

const submitButtonClass =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const cancelLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40";

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * 매물 후보 등록·수정 공용 폼. sourceUrl은 저장·재방문 용도로만 쓰고, 이
 * 컴포넌트도 서버도 그 URL을 직접 요청(fetch)하지 않는다 — 사용자가 입력한
 * 값을 그대로 검증(candidatePropertySchema)해 저장할 뿐이다.
 */
export function CandidatePropertyForm({
  mode,
  candidateId,
  initialValues = emptyCandidatePropertyValues,
  suggestionId,
}: {
  mode: "create" | "edit";
  candidateId?: string;
  initialValues?: CandidatePropertyFormValues;
  /** 관리자가 공유한 매물(ProjectPropertySuggestion)에서 이 폼을 열었다면 그 id. 저장 성공 시 공유 건을 SAVED로 연결하는 데만 쓴다. */
  suggestionId?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<CandidatePropertyFormValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(patch: Partial<CandidatePropertyFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const price = toNumberOrNull(values.price);
    const deposit = toNumberOrNull(values.deposit);
    const monthlyRent = toNumberOrNull(values.monthlyRent);
    const area = toNumberOrNull(values.area);
    const roomCount = toNumberOrNull(values.roomCount);
    if ([price, deposit, monthlyRent, area, roomCount].some((v) => Number.isNaN(v))) {
      setError("숫자 항목에는 숫자만 입력해주세요.");
      return;
    }

    const parsed = candidatePropertySchema.safeParse({
      sourceUrl: values.sourceUrl,
      title: values.title,
      address: values.address,
      transactionType: values.transactionType || null,
      price,
      deposit,
      monthlyRent,
      area,
      roomCount,
      availableDate: values.availableDate,
      memo: values.memo,
      advantages: values.advantages,
      concerns: values.concerns,
      status: values.status,
      suggestionId: mode === "create" ? suggestionId : undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }

    setLoading(true);
    try {
      const url =
        mode === "create" ? "/api/my/candidate-properties" : `/api/my/candidate-properties/${candidateId}`;
      const res = await fetch(url, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.push(`/my/candidate-properties/${mode === "create" ? data.id : candidateId}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid min-w-0 gap-6" noValidate>
        <div className="grid min-w-0 gap-4">
          <h3 className="text-base font-black text-forest">매물 정보</h3>
          <label className={labelClass}>
            원본 매물 URL
            <input
              required
              type="url"
              inputMode="url"
              value={values.sourceUrl}
              onChange={(event) => update({ sourceUrl: event.target.value })}
              disabled={loading}
              placeholder="https://fin.land.naver.com/..."
              className={fieldClass}
            />
          </label>
          <p className="-mt-2 text-xs text-ink/50">
            외부 사이트에서 확인한 매물 링크를 붙여넣어 주세요. 이 링크의 내용을 자동으로 불러오지는 않습니다 — 아래 항목을 직접 입력해주세요.
          </p>
          <label className={labelClass}>
            매물 이름 또는 별칭
            <input
              required
              value={values.title}
              onChange={(event) => update({ title: event.target.value })}
              disabled={loading}
              placeholder="예: 역삼동 24평 전세"
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            주소 <span className="font-normal text-ink/50">선택 입력</span>
            <input
              value={values.address}
              onChange={(event) => update({ address: event.target.value })}
              disabled={loading}
              className={fieldClass}
            />
          </label>
        </div>

        <div className="grid min-w-0 gap-4">
          <h3 className="text-base font-black text-forest">거래 조건</h3>
          <label className={labelClass}>
            거래 유형 <span className="font-normal text-ink/50">선택 입력</span>
            <select
              value={values.transactionType}
              onChange={(event) =>
                update({ transactionType: event.target.value as CandidatePropertyTransactionType | "" })
              }
              disabled={loading}
              className={fieldClass}
            >
              <option value="">선택 안 함</option>
              {candidatePropertyTransactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className={labelClass}>
              매매가(원) <span className="font-normal text-ink/50">선택 입력</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={values.price}
                onChange={(event) => update({ price: event.target.value })}
                disabled={loading}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              보증금(원) <span className="font-normal text-ink/50">선택 입력</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={values.deposit}
                onChange={(event) => update({ deposit: event.target.value })}
                disabled={loading}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              월세(원) <span className="font-normal text-ink/50">선택 입력</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={values.monthlyRent}
                onChange={(event) => update({ monthlyRent: event.target.value })}
                disabled={loading}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              전용면적(㎡) <span className="font-normal text-ink/50">선택 입력</span>
              <input
                type="number"
                inputMode="decimal"
                min={0}
                step="0.01"
                value={values.area}
                onChange={(event) => update({ area: event.target.value })}
                disabled={loading}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              방 개수 <span className="font-normal text-ink/50">선택 입력</span>
              <input
                type="number"
                inputMode="numeric"
                min={0}
                value={values.roomCount}
                onChange={(event) => update({ roomCount: event.target.value })}
                disabled={loading}
                className={fieldClass}
              />
            </label>
            <label className={labelClass}>
              입주 가능일 <span className="font-normal text-ink/50">선택 입력</span>
              <DateField
                value={values.availableDate}
                onChange={(next) => update({ availableDate: next })}
                disabled={loading}
                className={fieldClass}
              />
            </label>
          </div>
        </div>

        <div className="grid min-w-0 gap-4">
          <h3 className="text-base font-black text-forest">메모</h3>
          <label className={labelClass}>
            메모 <span className="font-normal text-ink/50">선택 입력</span>
            <textarea
              rows={3}
              value={values.memo}
              onChange={(event) => update({ memo: event.target.value })}
              disabled={loading}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            장점 <span className="font-normal text-ink/50">선택 입력</span>
            <textarea
              rows={2}
              value={values.advantages}
              onChange={(event) => update({ advantages: event.target.value })}
              disabled={loading}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            걱정되는 점 <span className="font-normal text-ink/50">선택 입력</span>
            <textarea
              rows={2}
              value={values.concerns}
              onChange={(event) => update({ concerns: event.target.value })}
              disabled={loading}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            확인 상태
            <select
              value={values.status}
              onChange={(event) => update({ status: event.target.value as CandidatePropertyStatus })}
              disabled={loading}
              className={fieldClass}
            >
              {candidatePropertyStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={loading} className={submitButtonClass}>
            {loading ? "저장 중..." : mode === "create" ? "매물 후보 저장" : "수정 저장"}
          </button>
          <Link
            href={mode === "create" ? "/my/candidate-properties" : `/my/candidate-properties/${candidateId}`}
            className={cancelLinkClass}
          >
            취소
          </Link>
        </div>
      </form>
    </Card>
  );
}
