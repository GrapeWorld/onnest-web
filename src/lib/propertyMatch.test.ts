import { describe, expect, it } from "vitest";
import { compareCandidateToPreference, type MatchableCandidate } from "@/lib/propertyMatch";

const baseCandidate: MatchableCandidate = {
  transactionType: "전세",
  price: null,
  deposit: 300_000_000,
  area: 60,
  roomCount: 3,
  availableDate: new Date("2026-09-01T00:00:00.000Z"),
  address: "서울특별시 강남구 테헤란로 123",
};

const basePreference = {
  desiredRegion: "강남구",
  transactionType: "전세",
  minBudget: 200_000_000,
  maxBudget: 350_000_000,
  minArea: 50,
  minRooms: 2,
  desiredMoveInDate: new Date("2026-10-01T00:00:00.000Z"),
};

function findItem(items: ReturnType<typeof compareCandidateToPreference>, label: string) {
  const item = items.find((i) => i.label === label);
  if (!item) throw new Error(`${label} 항목이 없습니다.`);
  return item;
}

describe("compareCandidateToPreference", () => {
  it("returns a single 확인 필요 placeholder when there is no saved preference", () => {
    const items = compareCandidateToPreference(baseCandidate, null);
    expect(items).toHaveLength(1);
    expect(items[0].result).toBe("확인 필요");
  });

  it("matches every dimension when the candidate satisfies the preference", () => {
    const items = compareCandidateToPreference(baseCandidate, basePreference);
    for (const item of items) {
      expect(item.result, `${item.label} 결과`).toBe("일치");
    }
  });

  describe("예산", () => {
    it("일치 within [minBudget, maxBudget]", () => {
      const items = compareCandidateToPreference(baseCandidate, basePreference);
      expect(findItem(items, "예산").result).toBe("일치");
    });

    it("불일치 above maxBudget", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, deposit: 400_000_000 },
        basePreference,
      );
      expect(findItem(items, "예산").result).toBe("불일치");
    });

    it("불일치 below minBudget", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, deposit: 100_000_000 },
        basePreference,
      );
      expect(findItem(items, "예산").result).toBe("불일치");
    });

    it("prefers price over deposit when both are set", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, price: 250_000_000, deposit: 999_999_999 },
        basePreference,
      );
      expect(findItem(items, "예산").result).toBe("일치");
    });

    it("확인 필요 when candidate has neither price nor deposit", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, deposit: null },
        basePreference,
      );
      expect(findItem(items, "예산").result).toBe("확인 필요");
    });

    it("확인 필요 when preference has no budget bounds", () => {
      const items = compareCandidateToPreference(baseCandidate, {
        ...basePreference,
        minBudget: null,
        maxBudget: null,
      });
      expect(findItem(items, "예산").result).toBe("확인 필요");
    });
  });

  describe("거래 유형", () => {
    it("불일치 when transaction types differ", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, transactionType: "매매" },
        basePreference,
      );
      expect(findItem(items, "거래 유형").result).toBe("불일치");
    });

    it("확인 필요 when candidate transaction type is missing", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, transactionType: null },
        basePreference,
      );
      expect(findItem(items, "거래 유형").result).toBe("확인 필요");
    });
  });

  describe("면적", () => {
    it("불일치 when smaller than minArea", () => {
      const items = compareCandidateToPreference({ ...baseCandidate, area: 40 }, basePreference);
      expect(findItem(items, "면적").result).toBe("불일치");
    });

    it("일치 exactly at minArea (boundary)", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, area: 50 },
        basePreference,
      );
      expect(findItem(items, "면적").result).toBe("일치");
    });
  });

  describe("방 개수", () => {
    it("불일치 when fewer than minRooms", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, roomCount: 1 },
        basePreference,
      );
      expect(findItem(items, "방 개수").result).toBe("불일치");
    });
  });

  describe("입주 가능일", () => {
    it("불일치 when available later than desired move-in date", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, availableDate: new Date("2026-11-01T00:00:00.000Z") },
        basePreference,
      );
      expect(findItem(items, "입주 가능일").result).toBe("불일치");
    });

    it("확인 필요 when candidate availableDate is missing", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, availableDate: null },
        basePreference,
      );
      expect(findItem(items, "입주 가능일").result).toBe("확인 필요");
    });
  });

  describe("희망 지역", () => {
    it("일치 when the desired region substring is contained in the address", () => {
      const items = compareCandidateToPreference(baseCandidate, basePreference);
      expect(findItem(items, "희망 지역").result).toBe("일치");
    });

    it("확인 필요 (never 불일치) when the address does not contain the region text", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, address: "경기도 성남시 분당구" },
        basePreference,
      );
      const region = findItem(items, "희망 지역");
      expect(region.result).toBe("확인 필요");
      expect(region.result).not.toBe("불일치");
    });

    it("확인 필요 when either address or desiredRegion is missing", () => {
      const items = compareCandidateToPreference(
        { ...baseCandidate, address: null },
        basePreference,
      );
      expect(findItem(items, "희망 지역").result).toBe("확인 필요");
    });
  });
});
