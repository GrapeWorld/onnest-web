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
  "작업 중",
  "작업 완료",
  "취소",
] as const;

export type ServiceRequestStatus = (typeof serviceRequestStatuses)[number];

/** "취소"로 바뀔 때만 사유(reason)가 필수다 — 수락(확인 중 진입)은 사유가 필요 없다. */
export const serviceRequestCancelledStatus: ServiceRequestStatus = "취소";

/**
 * 신청 완료·신청 내역 화면에 쓰는 처리 시간 안내. "즉시"·"반드시"·
 * "최저가"·"100% 연결" 같은 보장 표현은 쓰지 않는다 — 실제로 지킬 수
 * 있다고 확정할 수 없는 약속이기 때문이다. 영업시간·휴일 정책이 아직
 * 없어 "영업일 기준 1일 이내"처럼 정교한 SLA 계산 대신 대략적인 기대치만
 * 안내한다. 운영 정책이 확정되면 이 상수만 바꾸면 된다(TODO: 실제
 * 처리 시간 데이터가 쌓이면 서비스 유형별로 나눠도 좋다).
 */
export const serviceRequestProcessingNotice =
  "영업일 기준 1일 이내에 담당 업체를 확인할 예정입니다. 업체 배정과 견적 도착 시 이메일로 알려드립니다.";

export const serviceRequestScopeNotice =
  "온네스트는 서비스를 직접 수행하는 업체가 아니라 제휴 업체를 연결해드리며, 지역·일정에 따라 견적이 도착하지 않거나 연결이 어려울 수 있습니다. 그런 경우에도 별도로 안내드리며, 신청 내역에서 언제든 취소를 요청할 수 있습니다.";

export const serviceStatusClassName: Record<string, string> = {
  신규: "bg-mint text-forest",
  "확인 중": "bg-cream text-forest",
  "상담 완료": "bg-sage/20 text-forest",
  "견적 전달": "bg-sage text-white",
  "작업 예정": "bg-navy/70 text-white",
  "작업 중": "bg-navy text-white",
  "작업 완료": "bg-forest text-white",
  취소: "bg-ink/15 text-ink/70",
};
