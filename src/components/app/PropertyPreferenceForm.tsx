"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  candidatePropertyTransactionTypes,
  type CandidatePropertyTransactionType,
} from "@/data/candidateProperty";
import { propertyPreferenceSchema } from "@/lib/candidatePropertySchema";
import { fieldClass, labelClass } from "./project-wizard/shared";
import { formatWon } from "@/lib/currency";
import { formatDate } from "@/lib/dates";

export type PropertyPreferenceValues = {
  desiredRegion: string;
  transactionType: CandidatePropertyTransactionType | "";
  minBudget: string;
  maxBudget: string;
  minArea: string;
  minRooms: string;
  desiredMoveInDate: string;
  mustHave: string;
  niceToHave: string;
  commuteMemo: string;
};

const emptyValues: PropertyPreferenceValues = {
  desiredRegion: "",
  transactionType: "",
  minBudget: "",
  maxBudget: "",
  minArea: "",
  minRooms: "",
  desiredMoveInDate: "",
  mustHave: "",
  niceToHave: "",
  commuteMemo: "",
};

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
}

type SavedPreference = {
  desiredRegion: string | null;
  transactionType: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  minArea: number | null;
  minRooms: number | null;
  desiredMoveInDate: Date | null;
  mustHave: string | null;
  niceToHave: string | null;
  commuteMemo: string | null;
} | null;

function toFormValues(saved: SavedPreference): PropertyPreferenceValues {
  if (!saved) return emptyValues;
  return {
    desiredRegion: saved.desiredRegion ?? "",
    transactionType: (saved.transactionType as CandidatePropertyTransactionType | null) ?? "",
    minBudget: saved.minBudget != null ? String(saved.minBudget) : "",
    maxBudget: saved.maxBudget != null ? String(saved.maxBudget) : "",
    minArea: saved.minArea != null ? String(saved.minArea) : "",
    minRooms: saved.minRooms != null ? String(saved.minRooms) : "",
    desiredMoveInDate: saved.desiredMoveInDate ? saved.desiredMoveInDate.toISOString().slice(0, 10) : "",
    mustHave: saved.mustHave ?? "",
    niceToHave: saved.niceToHave ?? "",
    commuteMemo: saved.commuteMemo ?? "",
  };
}

/** 희망 조건 카드. 저장된 값이 없으면 요약 대신 안내를, 있으면 요약과 수정 버튼을 보여준다. */
export function PropertyPreferenceForm({ preference }: { preference: SavedPreference }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState<PropertyPreferenceValues>(() => toFormValues(preference));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function update(patch: Partial<PropertyPreferenceValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  function openForm() {
    setValues(toFormValues(preference));
    setError(null);
    setOpen(true);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const minBudget = toNumberOrNull(values.minBudget);
    const maxBudget = toNumberOrNull(values.maxBudget);
    const minArea = toNumberOrNull(values.minArea);
    const minRooms = toNumberOrNull(values.minRooms);
    if ([minBudget, maxBudget, minArea, minRooms].some((v) => Number.isNaN(v))) {
      setError("숫자 항목에는 숫자만 입력해주세요.");
      return;
    }

    const parsed = propertyPreferenceSchema.safeParse({
      desiredRegion: values.desiredRegion,
      transactionType: values.transactionType || null,
      minBudget,
      maxBudget,
      minArea,
      minRooms,
      desiredMoveInDate: values.desiredMoveInDate,
      mustHave: values.mustHave,
      niceToHave: values.niceToHave,
      commuteMemo: values.commuteMemo,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/my/property-preference", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }
      setOpen(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-black text-forest">희망 조건</h2>
            {preference ? (
              <dl className="mt-3 grid gap-2 text-sm text-ink/65 sm:grid-cols-2">
                {preference.desiredRegion && (
                  <div className="min-w-0 break-words">
                    <dt className="font-bold text-forest">희망 지역</dt>
                    <dd>{preference.desiredRegion}</dd>
                  </div>
                )}
                {preference.transactionType && (
                  <div>
                    <dt className="font-bold text-forest">거래 유형</dt>
                    <dd>{preference.transactionType}</dd>
                  </div>
                )}
                {(preference.minBudget != null || preference.maxBudget != null) && (
                  <div className="min-w-0 break-words">
                    <dt className="font-bold text-forest">예산</dt>
                    <dd>
                      {preference.minBudget != null ? `${formatWon(preference.minBudget)}원` : "제한 없음"} ~{" "}
                      {preference.maxBudget != null ? `${formatWon(preference.maxBudget)}원` : "제한 없음"}
                    </dd>
                  </div>
                )}
                {preference.minArea != null && (
                  <div>
                    <dt className="font-bold text-forest">최소 면적</dt>
                    <dd>{preference.minArea}㎡ 이상</dd>
                  </div>
                )}
                {preference.minRooms != null && (
                  <div>
                    <dt className="font-bold text-forest">최소 방 개수</dt>
                    <dd>{preference.minRooms}개 이상</dd>
                  </div>
                )}
                {preference.desiredMoveInDate && (
                  <div>
                    <dt className="font-bold text-forest">희망 입주일</dt>
                    <dd>{formatDate(preference.desiredMoveInDate)}까지</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="mt-2 text-sm text-ink/60">
                희망 조건을 저장하면 매물 후보와 자동으로 비교해 볼 수 있습니다.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={openForm}
            className="shrink-0 rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40"
          >
            {preference ? "조건 수정" : "희망 조건 설정"}
          </button>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid min-w-0 gap-4" noValidate>
        <h2 className="text-lg font-black text-forest">희망 조건</h2>
        <label className={labelClass}>
          희망 지역 <span className="font-normal text-ink/50">선택 입력</span>
          <input
            value={values.desiredRegion}
            onChange={(event) => update({ desiredRegion: event.target.value })}
            disabled={saving}
            placeholder="예: 강남구"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          거래 유형 <span className="font-normal text-ink/50">선택 입력</span>
          <select
            value={values.transactionType}
            onChange={(event) => update({ transactionType: event.target.value as CandidatePropertyTransactionType | "" })}
            disabled={saving}
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
            최소 예산(원) <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={values.minBudget}
              onChange={(event) => update({ minBudget: event.target.value })}
              disabled={saving}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            최대 예산(원) <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={values.maxBudget}
              onChange={(event) => update({ maxBudget: event.target.value })}
              disabled={saving}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            최소 면적(㎡) <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step="0.01"
              value={values.minArea}
              onChange={(event) => update({ minArea: event.target.value })}
              disabled={saving}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            최소 방 개수 <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={values.minRooms}
              onChange={(event) => update({ minRooms: event.target.value })}
              disabled={saving}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            희망 입주일 <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="date"
              value={values.desiredMoveInDate}
              onChange={(event) => update({ desiredMoveInDate: event.target.value })}
              disabled={saving}
              className={fieldClass}
            />
          </label>
        </div>
        <label className={labelClass}>
          필수 조건 <span className="font-normal text-ink/50">선택 입력</span>
          <textarea
            rows={2}
            value={values.mustHave}
            onChange={(event) => update({ mustHave: event.target.value })}
            disabled={saving}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          선호 조건 <span className="font-normal text-ink/50">선택 입력</span>
          <textarea
            rows={2}
            value={values.niceToHave}
            onChange={(event) => update({ niceToHave: event.target.value })}
            disabled={saving}
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          통근·생활권 메모 <span className="font-normal text-ink/50">선택 입력</span>
          <textarea
            rows={2}
            value={values.commuteMemo}
            onChange={(event) => update({ commuteMemo: event.target.value })}
            disabled={saving}
            className={fieldClass}
          />
        </label>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "저장 중..." : "희망 조건 저장"}
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
          >
            취소
          </button>
        </div>
      </form>
    </Card>
  );
}
