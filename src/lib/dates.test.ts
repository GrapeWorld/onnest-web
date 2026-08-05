import { describe, expect, it } from "vitest";
import { kstDateStringToUtc, daysUntil, formatDDay } from "@/lib/dates";

describe("kstDateStringToUtc", () => {
  it("converts a KST calendar date to its UTC midnight-KST instant (KST is UTC+9)", () => {
    expect(kstDateStringToUtc("2026-08-04").toISOString()).toBe(
      "2026-08-03T15:00:00.000Z",
    );
  });

  it("a moment just before KST midnight belongs to the previous KST day's range", () => {
    const startOfAug4Kst = kstDateStringToUtc("2026-08-04");
    const justBefore = new Date(startOfAug4Kst.getTime() - 1);
    // 08:59:59.999 KST 8/4 == 23:59:59.999 UTC 8/3 — 이 순간은 8/4 필터의
    // gte 경계보다 앞이어야 한다(9시간 오차가 있었다면 여기서 실패한다).
    expect(justBefore < startOfAug4Kst).toBe(true);
    expect(justBefore.toISOString()).toBe("2026-08-03T14:59:59.999Z");
  });
});

// 기존 함수들의 회귀 확인 — 이 파일 전에는 dates.ts 단위테스트가 없었다.
describe("daysUntil/formatDDay", () => {
  it("returns 0 (D-DAY) for the same date", () => {
    const date = new Date("2026-08-04T00:00:00.000Z");
    expect(daysUntil(date, date)).toBe(0);
    expect(formatDDay(date, date)).toBe("D-DAY");
  });

  it("returns a positive day count formatted as D-n for a future date", () => {
    const from = new Date("2026-08-04T00:00:00.000Z");
    const date = new Date("2026-08-07T00:00:00.000Z");
    expect(daysUntil(date, from)).toBe(3);
    expect(formatDDay(date, from)).toBe("D-3");
  });

  it("formats a past date as N일 지남", () => {
    const from = new Date("2026-08-04T00:00:00.000Z");
    const date = new Date("2026-08-01T00:00:00.000Z");
    expect(daysUntil(date, from)).toBe(-3);
    expect(formatDDay(date, from)).toBe("3일 지남");
  });
});
