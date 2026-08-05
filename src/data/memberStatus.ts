export const memberStatuses = [
  "ACTIVE",
  "PENDING",
  "DORMANT",
  "SUSPENDED",
  "WITHDRAWN",
  "BLOCKED",
] as const;

export type MemberStatus = (typeof memberStatuses)[number];

export const memberStatusLabels: Record<MemberStatus, string> = {
  ACTIVE: "정상 이용",
  PENDING: "가입·인증 대기",
  DORMANT: "휴면",
  SUSPENDED: "이용 정지",
  WITHDRAWN: "탈퇴",
  BLOCKED: "영구 제한",
};

export const memberStatusClassName: Record<MemberStatus, string> = {
  ACTIVE: "bg-mint text-forest",
  PENDING: "bg-cream text-forest",
  DORMANT: "bg-cream text-ink/60",
  SUSPENDED: "bg-navy text-white",
  WITHDRAWN: "bg-ink/15 text-ink/70",
  BLOCKED: "bg-forest text-white",
};

/** 이 상태의 계정은 로그인을 막는다. 사유는 응답에 노출하지 않는다(일반 로그인 오류와 동일 메시지). */
export const loginBlockedStatuses: MemberStatus[] = [
  "SUSPENDED",
  "WITHDRAWN",
  "BLOCKED",
];
