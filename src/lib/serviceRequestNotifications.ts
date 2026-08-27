import type { Prisma, PrismaClient } from "@prisma/client";
import type { ServiceRequestStatus } from "@/data/serviceRequests";
import { serviceRequestCancelledStatus } from "@/data/serviceRequests";
import type { NotificationType } from "@/data/notification";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * 이 요청을 지금 조회할 수 있는 업체 구성원의 id 목록.
 * evaluateServiceRequestReadAccess(partnerAuth.ts)와 같은 기준이다 —
 * OWNER·MANAGER·VIEWER는 항상, STAFF는 자신이 담당으로 지정된 경우에만.
 * 접근 권한이 없는 사람에게 알림 링크를 주지 않기 위해 알림 수신자 계산
 * 자체를 이 기준에 맞춘다.
 */
export async function getReadablePartnerRequestRecipients(
  db: Db,
  partnerId: string,
  partnerStaffId: string | null,
) {
  const members = await db.partnerMembership.findMany({
    where: { partnerId, status: "ACTIVE" },
    select: { userId: true, role: true },
  });
  return members
    .filter((member) => member.role !== "STAFF" || member.userId === partnerStaffId)
    .map((member) => member.userId);
}

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

/**
 * 인앱 알림은 이메일보다 피로도 부담이 적어(로그인 후 알림함에서만 보임)
 * "작업 예정"처럼 세부 진행 단계도 포함한다 — 이메일 정책(위 맵)과는
 * 독립적으로 관리한다.
 */
const customerInAppStatusCopy: Partial<
  Record<ServiceRequestStatus, { type: NotificationType; title: string; body: string }>
> = {
  "확인 중": {
    type: "SERVICE_REQUEST_ACCEPTED",
    title: "업체가 요청을 확인했습니다",
    body: "곧 견적이 도착할 예정입니다.",
  },
  "작업 예정": {
    type: "SERVICE_REQUEST_SCHEDULED",
    title: "작업 예정으로 변경되었습니다",
    body: "곧 작업이 진행됩니다. 신청 내역에서 일정을 확인해주세요.",
  },
  "작업 완료": {
    type: "SERVICE_REQUEST_COMPLETED",
    title: "서비스가 완료되었습니다",
    body: "신청하신 서비스 작업이 완료되었습니다.",
  },
  [serviceRequestCancelledStatus]: {
    type: "SERVICE_REQUEST_CANCEL_HANDLED",
    title: "서비스 신청이 취소되었습니다",
    body: "신청하신 서비스가 취소되었습니다.",
  },
};

/**
 * 상태 변경 한 건에 대해 고객에게 보낼 인앱 알림을 결정한다. 고객이 남긴
 * 취소 요청이 이번 변경으로 처리(반영)된 것이면(상태와 무관하게) 그 사실을
 * 우선 안내하고, 아닌 경우에만 일반 상태 전환 문구를 쓴다 — 같은 전환에
 * 대해 두 알림이 겹치지 않게 한다.
 */
export function getServiceRequestCustomerNotification(params: {
  requestId: string;
  toStatus: ServiceRequestStatus;
  hadPendingCancelRequest: boolean;
}): { type: NotificationType; title: string; body: string; dedupeKey: string } | null {
  const { requestId, toStatus, hadPendingCancelRequest } = params;

  if (hadPendingCancelRequest) {
    const body =
      toStatus === serviceRequestCancelledStatus
        ? "요청하신 대로 서비스 신청이 취소되었습니다."
        : `취소 요청을 확인했습니다. 신청은 계속 진행되어 현재 상태는 "${toStatus}"입니다.`;
    return {
      type: "SERVICE_REQUEST_CANCEL_HANDLED",
      title: "취소 요청이 처리되었습니다",
      body,
      dedupeKey: `SERVICE_REQUEST_CANCEL_HANDLED:${requestId}:${toStatus}`,
    };
  }

  const copy = customerInAppStatusCopy[toStatus];
  if (!copy) return null;
  return {
    type: copy.type,
    title: copy.title,
    body: copy.body,
    dedupeKey: `${copy.type}:${requestId}:${toStatus}`,
  };
}
