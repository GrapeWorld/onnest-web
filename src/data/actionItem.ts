/**
 * "내가 할 일" 업무함 P0 타입 목록. Notification 타입 목록(notification.ts)과
 * 같은 원칙 — 문자열을 코드 여기저기서 직접 짓지 않고 이 상수만 참조한다.
 * 시간 기반(장기 미처리·만료 예정 등)·완료확인 연동 항목은 3·4단계에서
 * 그 기능과 함께 추가한다 — 지금은 이벤트 발생 시점에 곧바로 만들 수 있는
 * 항목만 포함한다.
 */
export const actionItemTypes = [
  // 고객
  "CUSTOMER_SELECT_QUOTE",
  "CUSTOMER_REVIEW_PROPERTY",
  // 업체
  "PARTNER_CONFIRM_NEW_REQUEST",
  "PARTNER_REGISTER_QUOTE",
  "PARTNER_HANDLE_CANCEL_REQUEST",
  "PARTNER_REGISTER_COMPLETION",
  // 관리자
  "ADMIN_ASSIGN_PARTNER",
  "ADMIN_HANDLE_CANCEL_REQUEST",
  "ADMIN_ANSWER_INQUIRY",
] as const;

export type ActionItemType = (typeof actionItemTypes)[number];

export const actionItemRoleContexts = ["CUSTOMER", "PARTNER", "ADMIN"] as const;
export type ActionItemRoleContext = (typeof actionItemRoleContexts)[number];

export const actionItemRoleContextLabels: Record<ActionItemRoleContext, string> = {
  CUSTOMER: "고객",
  PARTNER: "업체",
  ADMIN: "관리자",
};

export const actionItemStatuses = ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
export type ActionItemStatus = (typeof actionItemStatuses)[number];

export const actionItemOpenStatuses: ActionItemStatus[] = ["PENDING", "IN_PROGRESS"];

export const actionItemPriorities = ["NORMAL", "IMPORTANT", "URGENT"] as const;
export type ActionItemPriority = (typeof actionItemPriorities)[number];

export const actionItemPriorityLabels: Record<ActionItemPriority, string> = {
  NORMAL: "보통",
  IMPORTANT: "중요",
  URGENT: "긴급",
};

export const actionItemTypeRoleContext: Record<ActionItemType, ActionItemRoleContext> = {
  CUSTOMER_SELECT_QUOTE: "CUSTOMER",
  CUSTOMER_REVIEW_PROPERTY: "CUSTOMER",
  PARTNER_CONFIRM_NEW_REQUEST: "PARTNER",
  PARTNER_REGISTER_QUOTE: "PARTNER",
  PARTNER_HANDLE_CANCEL_REQUEST: "PARTNER",
  PARTNER_REGISTER_COMPLETION: "PARTNER",
  ADMIN_ASSIGN_PARTNER: "ADMIN",
  ADMIN_HANDLE_CANCEL_REQUEST: "ADMIN",
  ADMIN_ANSWER_INQUIRY: "ADMIN",
};
