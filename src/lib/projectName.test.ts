import { describe, expect, it } from "vitest";
import { suggestProjectName } from "@/lib/projectName";

describe("suggestProjectName", () => {
  it("uses the address's 동 when present for residential", () => {
    const name = suggestProjectName({
      address: "경기도 남양주시 별내동 123",
      spaceCategory: "residential",
      spaceSubtype: "residential_officetel",
      transactionType: "jeonse",
    });
    expect(name).toBe("별내동 주거용 오피스텔 전세 입주");
  });

  it("falls back to a generic name when there is no address (residential)", () => {
    const name = suggestProjectName({
      spaceCategory: "residential",
      spaceSubtype: "apartment",
      transactionType: "jeonse",
    });
    expect(name).toBe("새 아파트 전세 프로젝트");
  });

  it("uses '이전' wording and 동 for non-residential with an address", () => {
    const name = suggestProjectName({
      address: "서울시 강남구 역삼동 45",
      spaceCategory: "office",
      spaceSubtype: "office",
      transactionType: "lease",
    });
    expect(name).toBe("역삼동 일반 사무실 임대 이전");
  });

  it("falls back to a generic name for non-residential without an address", () => {
    const name = suggestProjectName({
      spaceCategory: "industrial",
      spaceSubtype: "factory",
      transactionType: "purchase",
    });
    expect(name).toBe("공장 매매 프로젝트");
  });

  it("does not hardcode any specific place name", () => {
    const name = suggestProjectName({
      spaceCategory: "industrial",
      spaceSubtype: "warehouse",
      transactionType: "lease",
    });
    expect(name).not.toMatch(/별내|강남|역삼/);
  });
});
