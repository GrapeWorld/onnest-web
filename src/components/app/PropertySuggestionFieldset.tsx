"use client";

import {
  candidatePropertyTransactionTypes,
  type CandidatePropertyTransactionType,
} from "@/data/candidateProperty";
import { fieldClass, labelClass } from "./project-wizard/shared";
import { DateField } from "@/components/ui/DateField";

export type PropertySuggestionFormValues = {
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
  sharedReason: string;
  cautionNote: string;
  adminMemo: string;
};

export const emptyPropertySuggestionValues: PropertySuggestionFormValues = {
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
  sharedReason: "",
  cautionNote: "",
  adminMemo: "",
};

export function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num : NaN;
}

/**
 * 관리자 매물 공유 폼의 입력 필드 묶음. 공유(생성)·수정 화면이 같은 필드
 * 집합을 쓰므로 이 컴포넌트로 공유한다 — 필드를 두 군데에 복제하지 않는다.
 */
export function PropertySuggestionFieldset({
  values,
  onChange,
  disabled,
}: {
  values: PropertySuggestionFormValues;
  onChange: (patch: Partial<PropertySuggestionFormValues>) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="grid min-w-0 gap-4">
        <label className={labelClass}>
          원본 매물 URL
          <input
            required
            type="url"
            inputMode="url"
            value={values.sourceUrl}
            onChange={(event) => onChange({ sourceUrl: event.target.value })}
            disabled={disabled}
            placeholder="https://fin.land.naver.com/..."
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          매물명 또는 별칭
          <input
            required
            value={values.title}
            onChange={(event) => onChange({ title: event.target.value })}
            disabled={disabled}
            placeholder="예: 거제시 아주동 24평 전세"
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          주소 <span className="font-normal text-ink/50">선택 입력</span>
          <input
            value={values.address}
            onChange={(event) => onChange({ address: event.target.value })}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className={labelClass}>
          거래 유형 <span className="font-normal text-ink/50">선택 입력</span>
          <select
            value={values.transactionType}
            onChange={(event) => onChange({ transactionType: event.target.value as CandidatePropertyTransactionType | "" })}
            disabled={disabled}
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
        <label className={labelClass}>
          매매가(원) <span className="font-normal text-ink/50">선택 입력</span>
          <input type="number" inputMode="numeric" min={0} value={values.price} onChange={(e) => onChange({ price: e.target.value })} disabled={disabled} className={fieldClass} />
        </label>
        <label className={labelClass}>
          보증금(원) <span className="font-normal text-ink/50">선택 입력</span>
          <input type="number" inputMode="numeric" min={0} value={values.deposit} onChange={(e) => onChange({ deposit: e.target.value })} disabled={disabled} className={fieldClass} />
        </label>
        <label className={labelClass}>
          월세(원) <span className="font-normal text-ink/50">선택 입력</span>
          <input type="number" inputMode="numeric" min={0} value={values.monthlyRent} onChange={(e) => onChange({ monthlyRent: e.target.value })} disabled={disabled} className={fieldClass} />
        </label>
        <label className={labelClass}>
          전용면적(㎡) <span className="font-normal text-ink/50">선택 입력</span>
          <input type="number" inputMode="decimal" min={0} step="0.01" value={values.area} onChange={(e) => onChange({ area: e.target.value })} disabled={disabled} className={fieldClass} />
        </label>
        <label className={labelClass}>
          방 개수 <span className="font-normal text-ink/50">선택 입력</span>
          <input type="number" inputMode="numeric" min={0} value={values.roomCount} onChange={(e) => onChange({ roomCount: e.target.value })} disabled={disabled} className={fieldClass} />
        </label>
        <label className={labelClass}>
          입주 가능일 <span className="font-normal text-ink/50">선택 입력</span>
          <DateField value={values.availableDate} onChange={(next) => onChange({ availableDate: next })} disabled={disabled} className={fieldClass} />
        </label>
      </div>

      <div className="grid min-w-0 gap-4">
        <label className={labelClass}>
          고객에게 공유할 이유
          <textarea
            rows={2}
            value={values.sharedReason}
            onChange={(event) => onChange({ sharedReason: event.target.value })}
            disabled={disabled}
            placeholder="예: 희망 지역과 예산 범위 안에 있는 매물입니다."
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          고객이 추가로 확인해야 할 점 <span className="font-normal text-ink/50">선택 입력</span>
          <textarea
            rows={2}
            value={values.cautionNote}
            onChange={(event) => onChange({ cautionNote: event.target.value })}
            disabled={disabled}
            placeholder="예: 실제 입주 가능일은 임대인과 별도 확인이 필요합니다."
            className={fieldClass}
          />
        </label>
        <label className={labelClass}>
          관리자 내부 메모 <span className="font-normal text-ink/50">선택 입력 · 고객에게 노출되지 않습니다</span>
          <textarea
            rows={2}
            value={values.adminMemo}
            onChange={(event) => onChange({ adminMemo: event.target.value })}
            disabled={disabled}
            className={fieldClass}
          />
        </label>
      </div>
    </>
  );
}
