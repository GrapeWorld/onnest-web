/**
 * 관리자가 프로젝트에 맞춰 공유한 매물에 대한 고객 응답 상태. NEW/VIEWED/
 * SAVED/EXPIRED는 시스템이 관리하고, 고객이 직접 고르는 값은
 * propertySuggestionCustomerResponses(3종)뿐이다.
 */
export const propertySuggestionCustomerStatuses = [
  "NEW",
  "VIEWED",
  "INTERESTED",
  "SAVED",
  "ON_HOLD",
  "NOT_INTERESTED",
  "EXPIRED",
] as const;
export type PropertySuggestionCustomerStatus = (typeof propertySuggestionCustomerStatuses)[number];

export const propertySuggestionCustomerStatusLabels: Record<PropertySuggestionCustomerStatus, string> = {
  NEW: "새로 공유됨",
  VIEWED: "확인함",
  INTERESTED: "관심 있음",
  SAVED: "내 매물 후보에 저장함",
  ON_HOLD: "보류",
  NOT_INTERESTED: "관심 없음",
  EXPIRED: "원본 매물 확인 필요",
};

export const propertySuggestionCustomerStatusClassName: Record<PropertySuggestionCustomerStatus, string> = {
  NEW: "bg-mint text-forest",
  VIEWED: "bg-cream text-forest",
  INTERESTED: "bg-sage/20 text-forest",
  SAVED: "bg-forest text-white",
  ON_HOLD: "bg-amber-100 text-amber-800",
  NOT_INTERESTED: "bg-ink/10 text-ink/50",
  EXPIRED: "bg-red-100 text-red-700",
};

/** 고객이 직접 선택할 수 있는 응답(3종). "관심 있어요" / "조금 더 볼게요" / "이번에는 제외할게요". */
export const propertySuggestionCustomerResponses = ["INTERESTED", "ON_HOLD", "NOT_INTERESTED"] as const;
export type PropertySuggestionCustomerResponse = (typeof propertySuggestionCustomerResponses)[number];

export const propertySuggestionCustomerResponseLabels: Record<PropertySuggestionCustomerResponse, string> = {
  INTERESTED: "관심 있어요",
  ON_HOLD: "조금 더 볼게요",
  NOT_INTERESTED: "이번에는 제외할게요",
};
