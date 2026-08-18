export const candidatePropertyTransactionTypes = ["매매", "전세", "월세", "기타"] as const;
export type CandidatePropertyTransactionType = (typeof candidatePropertyTransactionTypes)[number];

export const candidatePropertyStatuses = [
  "관심",
  "방문 예정",
  "방문 완료",
  "보류",
  "최종 후보",
] as const;
export type CandidatePropertyStatus = (typeof candidatePropertyStatuses)[number];

export const candidatePropertyStatusClassName: Record<CandidatePropertyStatus, string> = {
  관심: "bg-cream text-forest",
  "방문 예정": "bg-sky-100 text-sky-700",
  "방문 완료": "bg-sage/20 text-forest",
  보류: "bg-amber-100 text-amber-800",
  "최종 후보": "bg-forest text-white",
};

/**
 * 방문 시 확인할 체크리스트 항목 전체 목록. API는 이 목록에 있는 라벨만
 * 저장을 허용한다(src/app/api/projects/[id]/steps/[slug]/checks의 화이트리스트
 * 검증과 같은 원칙) — 임의 문자열이 체크 항목으로 저장되는 것을 막는다.
 * "법률적·부동산 전문 판단을 대신하지 않는다"는 안내를 화면에 함께 둔다.
 */
export const propertyVisitChecklistItems = [
  "실제 채광과 방향",
  "소음",
  "수압과 배수",
  "누수 및 결로 흔적",
  "곰팡이",
  "창문과 방충망",
  "수납공간",
  "주차",
  "엘리베이터",
  "관리비 포함 항목",
  "대중교통과 생활 편의시설",
  "입주 가능일",
  "수리 필요 항목",
  "계약 전 별도 확인이 필요한 사항",
] as const;

/**
 * 매물 링크의 출처 라벨. URL 도메인만으로 판별하고 외부 페이지 내용은
 * 절대 조회하지 않는다(src/lib/propertyUrl.ts의 getPropertySourceLabel).
 * "일치"를 보장하는 표현이 아니라 출처 구분용 라벨일 뿐이다.
 */
export const propertySourceLabels = ["네이버페이 부동산", "기타 외부 매물"] as const;
export type PropertySourceLabel = (typeof propertySourceLabels)[number];

/**
 * 조건 비교 결과. "추천"·"안전"·"문제없음"처럼 결과를 보장하는 표현은 쓰지
 * 않는다 — 사실 확인(일치/불일치) 또는 정보 부족(확인 필요)만 표시한다.
 */
export const propertyMatchResults = ["일치", "불일치", "확인 필요"] as const;
export type PropertyMatchResult = (typeof propertyMatchResults)[number];

export const propertyMatchResultClassName: Record<PropertyMatchResult, string> = {
  일치: "bg-sage/20 text-forest",
  불일치: "bg-red-100 text-red-700",
  "확인 필요": "bg-amber-100 text-amber-800",
};
