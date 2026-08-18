import type { ServiceRequestStatus } from "@/data/serviceRequests";

/**
 * 고객이 다음에 뭘 해야 하는지(또는 지금 무슨 일이 일어나고 있는지)를 한
 * 문장으로 알려준다. cancelRequestedAt이 있으면 실제 status와 무관하게
 * "취소 요청 중" 문구를 우선한다 — 상태 자체는 관리자·업체 확인 전까지
 * 그대로 유지되기 때문이다(src/app/api/my/service-requests/[id]/cancel 참고).
 * noPartnerNoticeSentAt도 같은 이유로 우선한다 — status는 계속 "신규" 등
 * 그대로지만 고객에게는 연결이 지연되고 있다는 사실을 더 우선 안내해야
 * 한다(관리자의 내부 사유는 여기 노출하지 않고 고정 문구만 쓴다).
 */
export function getServiceRequestNextAction(request: {
  status: ServiceRequestStatus | string;
  cancelRequestedAt?: Date | string | null;
  noPartnerNoticeSentAt?: Date | string | null;
}): string {
  if (request.cancelRequestedAt) {
    return "취소 요청을 확인하고 있습니다.";
  }
  if (request.noPartnerNoticeSentAt) {
    return "업체 연결이 지연되고 있어 계속 확인 중입니다. 다른 서비스 유형으로 다시 신청하거나 문의해주세요.";
  }

  switch (request.status as ServiceRequestStatus) {
    case "신규":
      return "담당 업체를 확인하고 있습니다.";
    case "확인 중":
      return "업체가 요청 내용을 확인하고 있습니다.";
    case "상담 완료":
      return "상담이 끝났습니다. 곧 견적이 도착할 예정입니다.";
    case "견적 전달":
      return "도착한 견적을 비교하고 선택해주세요.";
    case "작업 예정":
      return "업체와 작업 일정을 확인해주세요.";
    case "작업 중":
      return "서비스가 진행 중입니다.";
    case "작업 완료":
      return "서비스가 완료되었습니다.";
    case "취소":
      return "신청이 취소되었습니다.";
    default:
      return "";
  }
}
