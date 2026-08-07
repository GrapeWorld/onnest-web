import {
  serviceRequestStatuses,
  serviceRequestCancelledStatus,
  type ServiceRequestStatus,
} from "@/data/serviceRequests";

const TERMINAL_STATUSES: ServiceRequestStatus[] = ["작업 완료", serviceRequestCancelledStatus];

/**
 * 파트너 쪽 상태 변경에만 적용한다 — 관리자는 이 검사를 거치지 않는다(수정·
 * 특수 케이스 처리를 위한 의도적 예외, admin/service-requests 라우트 참고).
 * 종료 상태(작업 완료·취소)에서는 어디로도 못 간다. 취소는 종료 상태가
 * 아닌 모든 상태에서 항상 갈 수 있다. 그 외에는 serviceRequestStatuses
 * 배열 순서(신규→...→작업 완료)상 인덱스가 커지는 방향으로만 이동
 * 가능하다 — 정방향 건너뛰기는 허용, 역방향은 항상 불가.
 */
export function isValidStatusTransition(
  from: ServiceRequestStatus,
  to: ServiceRequestStatus,
): boolean {
  if (TERMINAL_STATUSES.includes(from)) return false;
  if (to === serviceRequestCancelledStatus) return true;
  return serviceRequestStatuses.indexOf(to) > serviceRequestStatuses.indexOf(from);
}

/** 상태 변경 폼의 선택지를 지금 상태에서 실제로 갈 수 있는 것만으로 좁힐 때 쓴다. */
export function getValidNextStatuses(from: ServiceRequestStatus): ServiceRequestStatus[] {
  return serviceRequestStatuses.filter((status) => isValidStatusTransition(from, status));
}
