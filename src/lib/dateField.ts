import { z } from "zod";

/**
 * "YYYY-MM-DD"가 실제로 존재하는 날짜인지 확인한다.
 *
 * new Date("2026-02-30")은 Invalid Date가 아니라 3월 2일로 넘어가 버리므로
 * 정규식과 Date 파싱만으로는 걸러지지 않는다. 파싱한 뒤 다시 조립해
 * 원래 문자열과 같은지 비교한다.
 */
export function isRealDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString().slice(0, 10) === value;
}

/** <input type="date"> 값을 받는 필수 날짜 필드 */
export function requiredDateField(message = "날짜를 입력해주세요.") {
  return z
    .string({ error: message })
    .refine(isRealDate, { message: "존재하지 않는 날짜입니다." });
}

/** 비워둘 수 있는 날짜 필드 */
export function optionalDateField() {
  return z
    .string()
    .refine((value) => value === "" || isRealDate(value), {
      message: "존재하지 않는 날짜입니다.",
    })
    .optional();
}
