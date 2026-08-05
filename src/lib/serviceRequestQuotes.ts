import type { ServiceRequestStatus } from "@/data/serviceRequests";

// "작업 예정" 이후로는 가격 협상이 끝난 것으로 보고 견적 등록·삭제·선택을
// 모두 잠근다. 파트너 쪽(등록/삭제)과 고객 쪽(선택) 모두 같은 기준을 쓴다 —
// 한쪽만 잠그면 반쪽짜리 방지가 된다.
export const quoteMutableStatuses: ServiceRequestStatus[] = [
  "신규",
  "확인 중",
  "상담 완료",
  "견적 전달",
];

export function isQuoteMutableStatus(status: string) {
  return quoteMutableStatuses.includes(status as ServiceRequestStatus);
}
