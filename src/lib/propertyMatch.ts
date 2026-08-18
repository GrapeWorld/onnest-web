import type { PropertyMatchResult } from "@/data/candidateProperty";

export type PropertyMatchItem = {
  label: string;
  result: PropertyMatchResult;
  detail: string;
};

export type MatchableCandidate = {
  transactionType: string | null;
  price: number | null;
  deposit: number | null;
  area: number | null;
  roomCount: number | null;
  availableDate: Date | null;
  address: string | null;
};

export type MatchablePreference = {
  desiredRegion: string | null;
  transactionType: string | null;
  minBudget: number | null;
  maxBudget: number | null;
  minArea: number | null;
  minRooms: number | null;
  desiredMoveInDate: Date | null;
} | null;

/**
 * 규칙 기반 조건 비교. AI 판단이 아니라 명확한 규칙만 쓴다 — 값이 없으면
 * 항상 "확인 필요"로 두고, 근거 없이 "불일치"를 단정하지 않는다(특히 지역은
 * 주소 표기 방식이 달라 단순 문자열 비교로 "불일치"를 확정할 수 없다).
 * "추천"·"안전"·"문제없음" 같은 결과 보장 표현은 쓰지 않고 사실만 나열한다.
 */
export function compareCandidateToPreference(
  candidate: MatchableCandidate,
  preference: MatchablePreference,
): PropertyMatchItem[] {
  if (!preference) {
    return [
      {
        label: "희망 조건",
        result: "확인 필요",
        detail: "아직 희망 조건을 저장하지 않았습니다.",
      },
    ];
  }

  const items: PropertyMatchItem[] = [];

  // 예산 — 매매가(price) 또는 전세·월세 보증금(deposit) 중 있는 값을 쓴다.
  const budgetAmount = candidate.price ?? candidate.deposit ?? null;
  const { minBudget, maxBudget } = preference;
  if (budgetAmount == null || (minBudget == null && maxBudget == null)) {
    items.push({ label: "예산", result: "확인 필요", detail: "매물 가격 또는 희망 예산이 입력되지 않았습니다." });
  } else {
    const withinMin = minBudget == null || budgetAmount >= minBudget;
    const withinMax = maxBudget == null || budgetAmount <= maxBudget;
    items.push({
      label: "예산",
      result: withinMin && withinMax ? "일치" : "불일치",
      detail: withinMin && withinMax ? "희망 예산 범위 안에 있습니다." : "희망 예산 범위를 벗어납니다.",
    });
  }

  // 거래 유형
  if (!candidate.transactionType || !preference.transactionType) {
    items.push({ label: "거래 유형", result: "확인 필요", detail: "매물 또는 희망 거래 유형이 입력되지 않았습니다." });
  } else {
    const matches = candidate.transactionType === preference.transactionType;
    items.push({
      label: "거래 유형",
      result: matches ? "일치" : "불일치",
      detail: matches ? "희망 거래 유형과 같습니다." : `희망 거래 유형(${preference.transactionType})과 다릅니다.`,
    });
  }

  // 면적
  if (candidate.area == null || preference.minArea == null) {
    items.push({ label: "면적", result: "확인 필요", detail: "매물 면적 또는 희망 최소 면적이 입력되지 않았습니다." });
  } else {
    const ok = candidate.area >= preference.minArea;
    items.push({
      label: "면적",
      result: ok ? "일치" : "불일치",
      detail: ok ? "희망 최소 면적 이상입니다." : "희망 최소 면적보다 작습니다.",
    });
  }

  // 방 개수
  if (candidate.roomCount == null || preference.minRooms == null) {
    items.push({ label: "방 개수", result: "확인 필요", detail: "매물 방 개수 또는 희망 최소 방 개수가 입력되지 않았습니다." });
  } else {
    const ok = candidate.roomCount >= preference.minRooms;
    items.push({
      label: "방 개수",
      result: ok ? "일치" : "불일치",
      detail: ok ? "희망 최소 방 개수 이상입니다." : "희망 최소 방 개수보다 적습니다.",
    });
  }

  // 입주 가능일 — 매물이 고객 희망일까지(또는 더 일찍) 입주 가능하면 일치.
  if (!candidate.availableDate || !preference.desiredMoveInDate) {
    items.push({ label: "입주 가능일", result: "확인 필요", detail: "매물 입주 가능일 또는 희망 입주일이 입력되지 않았습니다." });
  } else {
    const ok = candidate.availableDate.getTime() <= preference.desiredMoveInDate.getTime();
    items.push({
      label: "입주 가능일",
      result: ok ? "일치" : "불일치",
      detail: ok ? "희망 입주일까지 입주할 수 있습니다." : "희망 입주일보다 늦게 입주 가능합니다.",
    });
  }

  // 희망 지역 — 주소 표기 방식이 다양해 문자열 비교만으로 "불일치"를 단정할
  // 수 없다. 포함 관계가 확인되면 "일치", 그렇지 않으면 항상 "확인 필요".
  if (!candidate.address || !preference.desiredRegion) {
    items.push({ label: "희망 지역", result: "확인 필요", detail: "매물 주소 또는 희망 지역이 입력되지 않았습니다." });
  } else {
    const normalizedAddress = candidate.address.replace(/\s+/g, "");
    const normalizedRegion = preference.desiredRegion.replace(/\s+/g, "");
    const matches = normalizedRegion.length > 0 && normalizedAddress.includes(normalizedRegion);
    items.push({
      label: "희망 지역",
      result: matches ? "일치" : "확인 필요",
      detail: matches
        ? "희망 지역 표기가 매물 주소에 포함됩니다."
        : "주소 표기 방식이 달라 자동으로 판단할 수 없습니다. 직접 확인해주세요.",
    });
  }

  return items;
}
