import { z } from "zod";

/**
 * 이 서비스가 실제로 다루는 날짜 범위. 운영 데이터가 이 범위를 벗어날 일은
 * 없다 — 좁게 잡을수록 `<input type="date">`의 연도 자리에 자릿수가 밀려
 * 들어가는 브라우저 버그(예: "202608"처럼 연도 칸에 6자리가 들어가는 문제)를
 * 서버·클라이언트 양쪽에서 확실히 걸러낼 수 있다.
 */
export const DATE_ONLY_MIN_YEAR = 1900;
export const DATE_ONLY_MAX_YEAR = 2100;

/**
 * "YYYY-MM-DD"가 실제로 존재하는 날짜이고, 연도가 4자리·정상 범위인지
 * 확인한다.
 *
 * new Date("2026-02-30")은 Invalid Date가 아니라 3월 2일로 넘어가 버리므로
 * 정규식과 Date 파싱만으로는 걸러지지 않는다. 파싱한 뒤 다시 조립해
 * 원래 문자열과 같은지 비교한다. 정규식 자체(`\d{4}`)가 이미 5자리 이상
 * 연도(`"12345-01-01"`)는 형식 단계에서 막지만, 4자리인데 범위 밖인 값
 * (`"0000-01-01"`, 이 서비스와 무관한 연도)은 별도로 범위를 확인해야 한다.
 */
export function isValidDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < DATE_ONLY_MIN_YEAR || year > DATE_ONLY_MAX_YEAR) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

/** 기존 이름 — 그대로 쓰는 곳이 많아 별칭으로 유지한다. */
export const isRealDate = isValidDateOnly;

/** "YYYY-MM-DD"를 그 날짜(UTC 자정)로 파싱한다. 유효하지 않으면 null. */
export function parseDateOnly(value: string): Date | null {
  if (!isValidDateOnly(value)) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date를 "YYYY-MM-DD"로 되돌린다(`<input type="date">` 초기값용, UTC 기준). */
export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `<input type="date" min>` 기본값 */
export const DATE_ONLY_MIN = `${DATE_ONLY_MIN_YEAR}-01-01`;
/** `<input type="date" max>` 기본값 */
export const DATE_ONLY_MAX = `${DATE_ONLY_MAX_YEAR}-12-31`;

/**
 * ISO 타임스탬프(연락 기록 등 `datetime-local` 입력값)가 이 서비스가 다루는
 * 연도 범위 안인지 확인한다. 날짜만 다루는 값과 달리 시각까지 포함하므로
 * `isValidDateOnly`와는 별도 함수로 둔다 — 형식 자체는 `new Date()`의
 * 관대한 파싱에 맡기되(달력 입력값이라 형식이 이미 브라우저가 보장한다),
 * 연도가 서비스 범위를 벗어난 값(달력 위젯의 연도 자리 오류로 생길 수 있는
 * 값 포함)은 걸러낸다.
 */
export function isReasonableTimestamp(value: string): boolean {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const year = date.getUTCFullYear();
  return year >= DATE_ONLY_MIN_YEAR && year <= DATE_ONLY_MAX_YEAR;
}

/** ISO 타임스탬프 필드(연락 기록 등)의 공통 서버 검증. */
export function reasonableTimestampField(message = "시각을 확인해주세요.") {
  return z.string().refine(isReasonableTimestamp, { message });
}

/** <input type="date"> 값을 받는 필수 날짜 필드 */
export function requiredDateField(message = "날짜를 입력해주세요.") {
  return z
    .string({ error: message })
    .refine(isValidDateOnly, { message: "존재하지 않는 날짜입니다." });
}
export const dateOnlySchema = requiredDateField;

/** 비워둘 수 있는 날짜 필드 */
export function optionalDateField() {
  return z
    .string()
    .refine((value) => value === "" || isValidDateOnly(value), {
      message: "존재하지 않는 날짜입니다.",
    })
    .optional();
}
export const optionalDateOnlySchema = optionalDateField;

/**
 * 시작일 ≤ 종료일 검증을 두 optional 날짜 필드에 붙인다. 스키마 객체에
 * `.superRefine`으로 이어붙여 쓴다(zod가 필드 간 검증을 이 형태로만
 * 지원한다). maxRangeDays를 주면 기간 상한도 같이 검사한다(내보내기 기간처럼
 * 무제한 범위 조회를 막아야 하는 곳에서 쓴다).
 */
export function dateRangeSchema<
  TFrom extends string,
  TTo extends string,
>(fromKey: TFrom, toKey: TTo, options?: { maxRangeDays?: number; rangeTooLongMessage?: string }) {
  return (data: Partial<Record<TFrom | TTo, string>>, ctx: z.RefinementCtx) => {
    const fromValue = data[fromKey];
    const toValue = data[toKey];
    if (!fromValue || !toValue || !isValidDateOnly(fromValue) || !isValidDateOnly(toValue)) return;
    const from = parseDateOnly(fromValue)!;
    const to = parseDateOnly(toValue)!;
    if (from > to) {
      ctx.addIssue({ code: "custom", path: [toKey], message: "종료일은 시작일보다 이후여야 합니다." });
      return;
    }
    if (options?.maxRangeDays) {
      const rangeDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
      if (rangeDays > options.maxRangeDays) {
        ctx.addIssue({
          code: "custom",
          path: [toKey],
          message: options.rangeTooLongMessage ?? "조회 기간이 너무 깁니다. 기간을 줄여주세요.",
        });
      }
    }
  };
}
