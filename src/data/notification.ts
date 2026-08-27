/**
 * 서비스 내 알림함 P0 타입 목록. 새 이벤트를 추가할 때는 반드시 이 파일에
 * type·category·라벨·이메일 병행 여부를 함께 등록한다 — 알림 생성 코드
 * 여기저기서 문자열을 직접 짓지 않고 이 상수만 참조하게 해서, 오타나
 * 정책 누락이 런타임이 아니라 타입 체크 단계에서 걸리게 한다.
 */
export const notificationTypes = [
  // 고객
  "SERVICE_REQUEST_PARTNER_ASSIGNED",
  "SERVICE_REQUEST_ACCEPTED",
  "SERVICE_REQUEST_QUOTE_RECEIVED",
  "SERVICE_REQUEST_SCHEDULED",
  "SERVICE_REQUEST_COMPLETED",
  "SERVICE_REQUEST_CANCEL_HANDLED",
  "SERVICE_REQUEST_NO_PARTNER",
  "INQUIRY_ANSWERED",
  // 업체
  "PARTNER_NEW_SERVICE_REQUEST",
  "PARTNER_SERVICE_REQUEST_UNASSIGNED",
  "PARTNER_QUOTE_SELECTED",
  "PARTNER_CANCEL_REQUESTED",
  "PARTNER_STAFF_ASSIGNED",
  "PARTNER_VERIFICATION_CHANGED",
  // 계정 공통(로그인 가능 여부와 무관하게 인앱에도 남긴다)
  "MEMBER_STATUS_CHANGED",
  "MEMBER_TYPE_CHANGED",
  "PAYMENT_TIER_CHANGED",
  "ADMIN_ROLE_CHANGED",
  "SOCIAL_ACCOUNT_UNLINKED",
  // 관리자
  "ADMIN_NEW_SERVICE_REQUEST",
  "ADMIN_NEW_INQUIRY",
  "ADMIN_CUSTOMER_CANCEL_REQUESTED",
  "ADMIN_PARTNER_REJECTED",
  "ADMIN_INQUIRY_ASSIGNED",
] as const;

export type NotificationType = (typeof notificationTypes)[number];

export const notificationCategories = ["SERVICE", "ACCOUNT", "ADMIN_OPS"] as const;
export type NotificationCategory = (typeof notificationCategories)[number];

export const notificationCategoryLabels: Record<NotificationCategory, string> = {
  SERVICE: "서비스",
  ACCOUNT: "계정",
  ADMIN_OPS: "운영",
};

export const notificationTypeCategory: Record<NotificationType, NotificationCategory> = {
  SERVICE_REQUEST_PARTNER_ASSIGNED: "SERVICE",
  SERVICE_REQUEST_ACCEPTED: "SERVICE",
  SERVICE_REQUEST_QUOTE_RECEIVED: "SERVICE",
  SERVICE_REQUEST_SCHEDULED: "SERVICE",
  SERVICE_REQUEST_COMPLETED: "SERVICE",
  SERVICE_REQUEST_CANCEL_HANDLED: "SERVICE",
  SERVICE_REQUEST_NO_PARTNER: "SERVICE",
  INQUIRY_ANSWERED: "SERVICE",
  PARTNER_NEW_SERVICE_REQUEST: "SERVICE",
  PARTNER_SERVICE_REQUEST_UNASSIGNED: "SERVICE",
  PARTNER_QUOTE_SELECTED: "SERVICE",
  PARTNER_CANCEL_REQUESTED: "SERVICE",
  PARTNER_STAFF_ASSIGNED: "SERVICE",
  PARTNER_VERIFICATION_CHANGED: "ACCOUNT",
  MEMBER_STATUS_CHANGED: "ACCOUNT",
  MEMBER_TYPE_CHANGED: "ACCOUNT",
  PAYMENT_TIER_CHANGED: "ACCOUNT",
  ADMIN_ROLE_CHANGED: "ACCOUNT",
  SOCIAL_ACCOUNT_UNLINKED: "ACCOUNT",
  ADMIN_NEW_SERVICE_REQUEST: "ADMIN_OPS",
  ADMIN_NEW_INQUIRY: "ADMIN_OPS",
  ADMIN_CUSTOMER_CANCEL_REQUESTED: "ADMIN_OPS",
  ADMIN_PARTNER_REJECTED: "ADMIN_OPS",
  ADMIN_INQUIRY_ASSIGNED: "ADMIN_OPS",
};

/**
 * 인앱 알림과 별개로 이메일도 반드시 같이 보내야 하는 타입. 로그인 세션이
 * 곧바로 무효화되거나(회원 정지 등 authVersion 증가) 포털 접근이 막혀
 * 인앱 알림함을 볼 수 없게 될 가능성이 있는 이벤트만 포함한다 — 나머지는
 * 인앱만으로 충분하다(모든 상태 변경마다 메일을 보내면 피로도만 늘어난다).
 */
export const notificationEmailRequiredTypes: ReadonlySet<NotificationType> = new Set([
  "MEMBER_STATUS_CHANGED",
  "ADMIN_ROLE_CHANGED",
  "SOCIAL_ACCOUNT_UNLINKED",
  "PARTNER_VERIFICATION_CHANGED",
]);

export function isNotificationEmailRequired(type: NotificationType) {
  return notificationEmailRequiredTypes.has(type);
}
