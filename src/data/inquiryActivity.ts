export const inquiryActivityActions = [
  "CREATED",
  "ASSIGNED",
  "UNASSIGNED",
  "STATUS_CHANGED",
  "NEXT_ACTION_CHANGED",
  "NOTE_ADDED",
  "CONTACT_LOGGED",
  "SATISFACTION_RATED",
] as const;
export type InquiryActivityAction = (typeof inquiryActivityActions)[number];

export const inquiryActivityActionLabels: Record<InquiryActivityAction, string> = {
  CREATED: "접수",
  ASSIGNED: "담당자 배정",
  UNASSIGNED: "담당자 해제",
  STATUS_CHANGED: "상태 변경",
  NEXT_ACTION_CHANGED: "다음 액션 변경",
  NOTE_ADDED: "내부 메모",
  CONTACT_LOGGED: "연락 기록",
  SATISFACTION_RATED: "만족도 평가",
};

/** 데이터 마이그레이션으로 소급 생성된 활동임을 표시하는 값. 실제 사람이 아니다. */
export const SYSTEM_MIGRATION_ACTOR = "SYSTEM_MIGRATION";

export const contactMethods = ["전화", "이메일", "문자", "카카오톡", "기타"] as const;
export type ContactMethod = (typeof contactMethods)[number];
