import type { ServiceRequestStatus } from "@/data/serviceRequests";

/**
 * 모든 상태 변경마다 이메일을 보내면 고객이 피로해지므로, 실제로 "다시
 * 서비스를 열어보지 않아도 알아야 할" 전환점만 고른다 — 수락(고객이 접수
 * 확인 후 기다리던 응답), 취소(고객이 다른 선택지를 찾아야 함), 작업 완료
 * (서비스 종료 확인). 일정 조율·작업 예정·작업 중처럼 세부 진행 단계는
 * 마이페이지에서 확인하도록 하고 메일까지는 보내지 않는다.
 */
const customerNotificationCopy: Partial<Record<ServiceRequestStatus, { subject: string; body: string }>> = {
  "확인 중": {
    subject: "업체가 요청을 확인했습니다",
    body: "신청하신 서비스를 업체가 확인했습니다. 곧 견적이 도착할 예정입니다.",
  },
  취소: {
    subject: "서비스 신청이 취소되었습니다",
    body: "신청하신 서비스가 취소되었습니다.",
  },
  "작업 완료": {
    subject: "서비스가 완료되었습니다",
    body: "신청하신 서비스 작업이 완료되었습니다.",
  },
};

/** 이 상태로 바뀔 때 고객에게 이메일을 보낼지, 보낸다면 어떤 문구를 쓸지. 안 보내면 undefined. */
export function getCustomerNotificationCopy(status: ServiceRequestStatus) {
  return customerNotificationCopy[status];
}
