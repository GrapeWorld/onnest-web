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

export const serviceRequestStatuses = [
  "신규",
  "상담 중",
  "파트너 연결",
  "완료",
] as const;

export type ServiceRequestStatus = (typeof serviceRequestStatuses)[number];

export const serviceStatusClassName: Record<string, string> = {
  신규: "bg-mint text-forest",
  "상담 중": "bg-cream text-forest",
  "파트너 연결": "bg-navy text-white",
  완료: "bg-forest text-white",
};
