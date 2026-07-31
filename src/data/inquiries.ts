export const inquiryTypes = [
  "개인 고객 문의",
  "집/사무실/공장 확인 문의",
  "서비스 이용 문의",
  "제휴 문의",
  "이사/청소 파트너",
  "인터넷/렌탈 파트너",
  "입주 보수/인테리어 파트너",
  "반려동물 입주 서비스 파트너",
  "투자/지원사업 문의",
];

export const spaceTypes = ["주거", "사무실", "공장", "기타"];

export const inquiryStatuses = [
  "신규",
  "검토 중",
  "파트너 배정",
  "답변 완료",
] as const;

export const statusClassName: Record<string, string> = {
  신규: "bg-mint text-forest",
  "검토 중": "bg-cream text-forest",
  "파트너 배정": "bg-navy text-white",
  "답변 완료": "bg-forest text-white",
};
