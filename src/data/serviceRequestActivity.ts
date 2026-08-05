export const serviceRequestActivityActions = [
  "STATUS_CHANGED",
  "STAFF_ASSIGNED",
  "STAFF_UNASSIGNED",
  "NOTE_ADDED",
  "CONTACT_LOGGED",
  "QUOTE_ADDED",
  "QUOTE_REMOVED",
  "QUOTE_SELECTED",
] as const;
export type ServiceRequestActivityAction = (typeof serviceRequestActivityActions)[number];

export const serviceRequestActivityActionLabels: Record<ServiceRequestActivityAction, string> = {
  STATUS_CHANGED: "상태 변경",
  STAFF_ASSIGNED: "담당 직원 배정",
  STAFF_UNASSIGNED: "담당 직원 해제",
  NOTE_ADDED: "내부 메모",
  CONTACT_LOGGED: "연락 기록",
  QUOTE_ADDED: "견적 등록",
  QUOTE_REMOVED: "견적 삭제",
  QUOTE_SELECTED: "견적 선택",
};

/** 관리자·업체 직원·고객 모두 같은 요청에 흔적을 남길 수 있어 처리자 구분이 필요하다. */
export const serviceRequestActorRoles = ["ADMIN", "PARTNER", "CUSTOMER"] as const;
export type ServiceRequestActorRole = (typeof serviceRequestActorRoles)[number];

export const serviceRequestActorRoleLabels: Record<ServiceRequestActorRole, string> = {
  ADMIN: "관리자",
  PARTNER: "업체",
  CUSTOMER: "고객",
};
