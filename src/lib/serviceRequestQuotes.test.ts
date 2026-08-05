import { describe, expect, it } from "vitest";
import { isQuoteMutableStatus } from "@/lib/serviceRequestQuotes";

describe("isQuoteMutableStatus", () => {
  it.each(["신규", "확인 중", "상담 완료", "견적 전달"])(
    "returns true for %s",
    (status) => {
      expect(isQuoteMutableStatus(status)).toBe(true);
    },
  );

  it.each(["작업 예정", "작업 완료", "취소"])("returns false for %s", (status) => {
    expect(isQuoteMutableStatus(status)).toBe(false);
  });

  it("returns false for an unrecognized status", () => {
    expect(isQuoteMutableStatus("알 수 없음")).toBe(false);
  });
});
