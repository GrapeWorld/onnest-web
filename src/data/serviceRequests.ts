export const serviceTypes = [
  "이사",
  "입주청소",
  "인터넷",
  "소규모 보수",
  "인테리어",
] as const;

export type ServiceType = (typeof serviceTypes)[number];

export const serviceDescriptions: Record<string, string> = {
  이사: "이사 일정과 차량, 엘리베이터 사용 가능 여부를 정리해 연결합니다.",
  입주청소: "입주 전 청소 희망일과 범위를 정리해 연결합니다.",
  인터넷: "인터넷 설치 가능 일정과 회선 종류를 확인해 연결합니다.",
  "소규모 보수": "도배, 방충망, 도어락, 수전 등 소규모 보수를 연결합니다.",
  인테리어: "부분 시공 범위와 예산을 정리해 상담을 연결합니다.",
};

// 업체 포털(파트너 포털)의 처리 워크플로 그대로다 — 관리자와 배정된 업체가
// 같은 값을 본다. 신청 접수 시 항상 "신규"로 시작하고, 업체가 배정되면
// (관리자가 새로 파트너를 연결하면) 다시 "신규"로 리셋된다(그 업체 큐의
// 시작점).
export const serviceRequestStatuses = [
  "신규",
  "확인 중",
  "상담 완료",
  "견적 전달",
  "작업 예정",
  "작업 완료",
  "취소",
] as const;

export type ServiceRequestStatus = (typeof serviceRequestStatuses)[number];

/** "취소"로 바뀔 때만 사유(reason)가 필수다 — 수락(확인 중 진입)은 사유가 필요 없다. */
export const serviceRequestCancelledStatus: ServiceRequestStatus = "취소";

export const serviceStatusClassName: Record<string, string> = {
  신규: "bg-mint text-forest",
  "확인 중": "bg-cream text-forest",
  "상담 완료": "bg-sage/20 text-forest",
  "견적 전달": "bg-sage text-white",
  "작업 예정": "bg-navy/70 text-white",
  "작업 완료": "bg-forest text-white",
  취소: "bg-ink/15 text-ink/70",
};
