/**
 * 관리자 Excel 내보내기 범위. "전체 고객"(ALL_CUSTOMERS)은 비동기 처리
 * 구조가 필요해 이번 릴리스의 API는 발급하지 않는다 — 감사 이력 모델에서만
 * 값을 예약해 후속 확장에 대비한다.
 */
export const adminExportTypes = ["CUSTOMER", "PROJECT"] as const;
export type AdminExportType = (typeof adminExportTypes)[number];

/**
 * 실제로 데이터가 존재하는 시트만 정의한다. "프로젝트 변경 이력"·"업체
 * 배정 이력"은 조사 결과 신뢰할 수 있는 이력 데이터가 없어 만들지 않는다
 * (docs/DEPLOY.md 대신 완료 보고에 근거를 남긴다).
 */
export const adminExportSections = [
  "CUSTOMER_SUMMARY",
  "PAYMENT_TIER_HISTORY",
  "PROJECT",
  "SCHEDULE",
  "CHECKLIST",
  "CANDIDATE_PROPERTY",
  "PROPERTY_SUGGESTION",
  "SERVICE_REQUEST",
  "SERVICE_REQUEST_ACTIVITY",
  "QUOTE",
  "QUOTE_SELECTION",
  "INQUIRY",
  "INQUIRY_MESSAGE",
  "DOCUMENT",
  "HANDOVER",
] as const;
export type AdminExportSection = (typeof adminExportSections)[number];

export const adminExportSectionLabels: Record<AdminExportSection, string> = {
  CUSTOMER_SUMMARY: "고객 요약",
  PAYMENT_TIER_HISTORY: "이용 등급 변경 이력",
  PROJECT: "프로젝트",
  SCHEDULE: "일정",
  CHECKLIST: "체크리스트",
  CANDIDATE_PROPERTY: "관심 매물",
  PROPERTY_SUGGESTION: "공유된 매물",
  SERVICE_REQUEST: "서비스 신청",
  SERVICE_REQUEST_ACTIVITY: "서비스 상태 이력",
  QUOTE: "견적",
  QUOTE_SELECTION: "고객 견적 선택",
  INQUIRY: "문의",
  INQUIRY_MESSAGE: "문의 메시지",
  DOCUMENT: "문서 메타데이터",
  HANDOVER: "생활 정보",
};

/** 고객 한 명 내보내기 기본 선택 시트. */
export const customerExportDefaultSections: AdminExportSection[] = [
  "CUSTOMER_SUMMARY",
  "PAYMENT_TIER_HISTORY",
  "PROJECT",
  "CANDIDATE_PROPERTY",
  "PROPERTY_SUGGESTION",
  "SERVICE_REQUEST",
  "INQUIRY",
];

/**
 * 프로젝트 한 개 내보내기 기본 선택 시트. INQUIRY/INQUIRY_MESSAGE는 넣지
 * 않는다 — Inquiry 모델에는 projectId가 없어(고객 단위로만 연결) 특정
 * 프로젝트에만 속한 문의를 신뢰성 있게 골라낼 방법이 없다. 억지로
 * "같은 고객의 문의 전체"를 끼워 넣으면 이 프로젝트와 무관한 문의까지
 * 새어나가 최소화 원칙에 어긋난다 — 고객 단위 내보내기에서만 제공한다.
 */
export const projectExportDefaultSections: AdminExportSection[] = [
  "PROJECT",
  "SCHEDULE",
  "CHECKLIST",
  "SERVICE_REQUEST",
  "SERVICE_REQUEST_ACTIVITY",
  "QUOTE",
  "QUOTE_SELECTION",
  "PROPERTY_SUGGESTION",
  "DOCUMENT",
  "HANDOVER",
];

/** PROJECT 내보내기에서는 프로젝트 단위로 신뢰성 있게 스코핑할 수 없어 항상 제외하는 시트. */
export const projectScopeUnsupportedSections: AdminExportSection[] = ["INQUIRY", "INQUIRY_MESSAGE"];

/**
 * 안전한 최대 범위. 초기 MVP는 동기 생성이라 지침대로 상한을 둔다 — 넘으면
 * 즉시 생성하는 대신 범위를 줄이라는 안내로 거부한다.
 */
export const ADMIN_EXPORT_MAX_ROWS_PER_SHEET = 5000;
export const ADMIN_EXPORT_MAX_DATE_RANGE_DAYS = 366 * 3;
