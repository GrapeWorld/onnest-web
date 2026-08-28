export const serviceRequestActivityActions = [
  "STATUS_CHANGED",
  "STAFF_ASSIGNED",
  "STAFF_UNASSIGNED",
  "NOTE_ADDED",
  "CONTACT_LOGGED",
  "QUOTE_ADDED",
  "QUOTE_REMOVED",
  "QUOTE_SELECTED",
  "CANCEL_REQUESTED",
  "NO_PARTNER_NOTICE",
  "COMPLETION_CONFIRMED",
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
  CANCEL_REQUESTED: "취소 요청",
  NO_PARTNER_NOTICE: "연결 어려움 안내",
  COMPLETION_CONFIRMED: "완료 확인",
};

/**
 * 고객 화면(마이페이지·프로젝트 서비스 화면)에 그대로 노출해도 되는
 * 활동만 담는다. 업체 내부 메모(NOTE_ADDED)·연락 기록(CONTACT_LOGGED)·
 * 담당 직원 배정/해제는 업체 내부 운영 정보라 고객에게 보여주지 않는다.
 * NO_PARTNER_NOTICE도 note에 관리자 내부 사유가 그대로 담겨 있어 제외한다 —
 * 고객에게는 이 활동 대신 항상 고정된 안전한 문구(ServiceRequestList)로만
 * 안내한다.
 */
export const customerVisibleActivityActions: ServiceRequestActivityAction[] = [
  "STATUS_CHANGED",
  "QUOTE_ADDED",
  "QUOTE_SELECTED",
  "CANCEL_REQUESTED",
];

/** 관리자·업체 직원·고객 모두 같은 요청에 흔적을 남길 수 있어 처리자 구분이 필요하다. */
export const serviceRequestActorRoles = ["ADMIN", "PARTNER", "CUSTOMER"] as const;
export type ServiceRequestActorRole = (typeof serviceRequestActorRoles)[number];

export const serviceRequestActorRoleLabels: Record<ServiceRequestActorRole, string> = {
  ADMIN: "관리자",
  PARTNER: "업체",
  CUSTOMER: "고객",
};
