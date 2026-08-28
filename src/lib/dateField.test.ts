import { describe, expect, it } from "vitest";
import {
  isValidDateOnly,
  parseDateOnly,
  formatDateOnly,
  requiredDateField,
  optionalDateField,
  dateRangeSchema,
  isReasonableTimestamp,
  reasonableTimestampField,
} from "@/lib/dateField";
import { z } from "zod";

describe("isValidDateOnly", () => {
  it.each(["2026-08-01", "2028-02-29"])("accepts %s", (value) => {
    expect(isValidDateOnly(value)).toBe(true);
  });

  it.each([
    ["202608-01-01", "6자리 연도(달력 입력 버그로 생길 수 있는 값)"],
    ["12345-01-01", "5자리 연도"],
    ["0000-01-01", "범위 밖 연도(0000)"],
    ["2026-13-01", "존재하지 않는 월"],
    ["2026-02-30", "존재하지 않는 날짜(2월 30일)"],
    ["2026-04-31", "존재하지 않는 날짜(4월 31일)"],
    ["아무 문자열", "형식 자체가 다름"],
    ["", "빈 문자열"],
    ["2026-8-1", "자리수가 맞지 않는 월·일"],
  ])("rejects %s (%s)", (value) => {
    expect(isValidDateOnly(value)).toBe(false);
  });

  it("서비스 범위를 벗어난 연도는 형식이 맞아도 거부한다", () => {
    expect(isValidDateOnly("1899-12-31")).toBe(false);
    expect(isValidDateOnly("2101-01-01")).toBe(false);
    expect(isValidDateOnly("1900-01-01")).toBe(true);
    expect(isValidDateOnly("2100-12-31")).toBe(true);
  });
});

describe("parseDateOnly / formatDateOnly", () => {
  it("왕복 변환이 원래 값을 보존한다", () => {
    const parsed = parseDateOnly("2026-08-01");
    expect(parsed).not.toBeNull();
    expect(formatDateOnly(parsed!)).toBe("2026-08-01");
  });

  it("유효하지 않은 값은 null을 반환한다", () => {
    expect(parseDateOnly("202608-01-01")).toBeNull();
    expect(parseDateOnly("2026-02-30")).toBeNull();
  });
});

describe("requiredDateField / optionalDateField", () => {
  const required = z.object({ date: requiredDateField() });
  const optional = z.object({ date: optionalDateField() });

  it("필수 필드는 6자리 연도를 거부한다", () => {
    expect(required.safeParse({ date: "202608-01-01" }).success).toBe(false);
    expect(required.safeParse({ date: "2026-08-01" }).success).toBe(true);
  });

  it("선택 필드는 빈 문자열을 허용하지만 malformed 값은 거부한다", () => {
    expect(optional.safeParse({ date: "" }).success).toBe(true);
    expect(optional.safeParse({ date: undefined }).success).toBe(true);
    expect(optional.safeParse({ date: "202608-01-01" }).success).toBe(false);
  });
});

describe("dateRangeSchema", () => {
  const schema = z
    .object({ from: optionalDateField(), to: optionalDateField() })
    .superRefine(dateRangeSchema("from", "to", { maxRangeDays: 90 }));

  it("종료일이 시작일보다 앞서면 거부한다", () => {
    const result = schema.safeParse({ from: "2026-08-10", to: "2026-08-01" });
    expect(result.success).toBe(false);
  });

  it("기간이 상한을 넘으면 거부한다", () => {
    const result = schema.safeParse({ from: "2026-01-01", to: "2026-12-31" });
    expect(result.success).toBe(false);
  });

  it("정상 범위는 통과한다", () => {
    const result = schema.safeParse({ from: "2026-08-01", to: "2026-08-10" });
    expect(result.success).toBe(true);
  });

  it("둘 중 하나가 비어 있으면 범위 검증을 건너뛴다", () => {
    const result = schema.safeParse({ from: "2026-08-01", to: "" });
    expect(result.success).toBe(true);
  });
});

describe("isReasonableTimestamp / reasonableTimestampField", () => {
  it("정상 범위의 ISO 타임스탬프를 허용한다", () => {
    expect(isReasonableTimestamp("2026-08-01T12:00:00.000Z")).toBe(true);
    expect(isReasonableTimestamp("2026-08-01T12:00")).toBe(true);
  });

  it("연도가 서비스 범위를 벗어나면 거부한다", () => {
    expect(isReasonableTimestamp("202608-01-01T12:00:00.000Z")).toBe(false);
    expect(isReasonableTimestamp("9999-01-01T00:00")).toBe(false);
  });

  it("파싱할 수 없는 값은 거부한다", () => {
    expect(isReasonableTimestamp("아무 문자열")).toBe(false);
  });

  it("스키마로도 같은 기준을 적용한다", () => {
    const schema = z.object({ contactedAt: reasonableTimestampField() });
    expect(schema.safeParse({ contactedAt: "2026-08-01T12:00" }).success).toBe(true);
    expect(schema.safeParse({ contactedAt: "9999-01-01T00:00" }).success).toBe(false);
  });
});
