"use client";

import { DATE_ONLY_MIN, DATE_ONLY_MAX, isValidDateOnly } from "@/lib/dateField";

/**
 * 날짜만 다루는 값(입주 예정일, 일정, 매물 입주 가능일 등)의 공용 입력.
 * 네이티브 `<input type="date">`를 그대로 쓴다 — 달력 선택기·모바일
 * 네이티브 선택기·키보드 직접 입력을 전부 그대로 유지하면서, 연도 자리에
 * 자릿수가 밀려 들어가는 브라우저 버그(예: "202608"처럼 6자리가 들어가는
 * 문제)를 두 겹으로 막는다 — min/max로 브라우저 자체 검증을 좁히고,
 * onChange에서 한 번 더 형식·범위를 확인해 이상한 값은 부모 상태에
 * 반영하지 않는다. 최종 방어선은 서버의 dateOnlySchema/optionalDateOnlySchema다.
 */
export function DateField({
  value,
  onChange,
  min = DATE_ONLY_MIN,
  max = DATE_ONLY_MAX,
  disabled,
  required,
  className,
  id,
  name,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  id?: string;
  name?: string;
  ariaLabel?: string;
}) {
  return (
    <input
      type="date"
      value={value}
      min={min}
      max={max}
      disabled={disabled}
      required={required}
      className={className}
      id={id}
      name={name}
      aria-label={ariaLabel}
      onChange={(event) => {
        const next = event.target.value;
        if (next !== "" && !isValidDateOnly(next)) return;
        onChange(next);
      }}
    />
  );
}
