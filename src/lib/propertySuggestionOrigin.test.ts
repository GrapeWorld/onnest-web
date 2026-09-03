import { describe, expect, it } from "vitest";
import { describeSuggestionOrigin } from "@/lib/propertySuggestionOrigin";

describe("describeSuggestionOrigin", () => {
  it("원문과 장점·걱정되는 점이 같으면 중복 노출 없이 반영 안내만 보여준다", () => {
    const result = describeSuggestionOrigin(
      { sharedReason: "희망 지역 안입니다.", cautionNote: "확인이 필요합니다." },
      "희망 지역 안입니다.",
      "확인이 필요합니다.",
    );
    expect(result).toEqual({
      showReason: false,
      showCaution: false,
      showReflectedNotice: true,
      showEmptyNotice: false,
    });
  });

  it("고객이 장점을 수정해 원문과 달라지면 원문을 별도로 보여준다", () => {
    const result = describeSuggestionOrigin(
      { sharedReason: "희망 지역 안입니다.", cautionNote: "확인이 필요합니다." },
      "직접 고친 장점 내용",
      "확인이 필요합니다.",
    );
    expect(result.showReason).toBe(true);
    expect(result.showCaution).toBe(false);
    expect(result.showReflectedNotice).toBe(false);
    expect(result.showEmptyNotice).toBe(false);
  });

  it("공유 이유·확인 필요 사항이 둘 다 없으면 빈 안내만 표시한다", () => {
    const result = describeSuggestionOrigin({ sharedReason: null, cautionNote: null }, "장점", "걱정");
    expect(result).toEqual({
      showReason: false,
      showCaution: false,
      showReflectedNotice: false,
      showEmptyNotice: true,
    });
  });

  it("공유 이유만 있고 걱정되는 점과 무관해도(cautionNote 없음) 반영 안내가 뜬다", () => {
    const result = describeSuggestionOrigin(
      { sharedReason: "희망 지역 안입니다.", cautionNote: null },
      "희망 지역 안입니다.",
      null,
    );
    expect(result.showReflectedNotice).toBe(true);
    expect(result.showEmptyNotice).toBe(false);
  });

  it("확인 필요 사항만 고객이 수정한 경우 그것만 원문으로 보여준다", () => {
    const result = describeSuggestionOrigin(
      { sharedReason: null, cautionNote: "확인이 필요합니다." },
      null,
      "직접 고친 확인사항",
    );
    expect(result.showReason).toBe(false);
    expect(result.showCaution).toBe(true);
    expect(result.showReflectedNotice).toBe(false);
  });
});
