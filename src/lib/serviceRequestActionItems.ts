import { serviceRequestCancelledStatus, type ServiceRequestStatus } from "@/data/serviceRequests";
import type { ActionItemType } from "@/data/actionItem";

export type ActionItemResolution = { sourceKey: string; outcome: "COMPLETED" | "CANCELLED" };
export type ActionItemCreation = {
  type: ActionItemType;
  title: string;
  description: string;
  sourceKey: string;
};

/**
 * 서비스 요청 상태 변경 한 건에 대해 열고 닫을 업체용 할 일을 결정한다.
 * 관리자·업체 두 라우트가 상태를 바꾸는 경로가 서로 다르지만(관리자는
 * 상태 머신 검증을 안 거친다) "이 전이가 어떤 할 일을 여닫는지"는 행위자와
 * 무관하게 같아야 하므로 이 함수 하나로 정책을 모은다 — 알림 정책을
 * 모아둔 getServiceRequestCustomerNotification과 같은 원칙.
 */
export function getServiceRequestActionItemPlan(params: {
  requestId: string;
  toStatus: ServiceRequestStatus;
  hadPendingCancelRequest: boolean;
  isNewPartnerAssignment: boolean;
}): { resolutions: ActionItemResolution[]; createForPartner?: ActionItemCreation } {
  const { requestId, toStatus, hadPendingCancelRequest, isNewPartnerAssignment } = params;
  const resolutions: ActionItemResolution[] = [];
  let createForPartner: ActionItemCreation | undefined;

  if (hadPendingCancelRequest) {
    resolutions.push(
      { sourceKey: `PARTNER_HANDLE_CANCEL_REQUEST:${requestId}`, outcome: "COMPLETED" },
      { sourceKey: `ADMIN_HANDLE_CANCEL_REQUEST:${requestId}`, outcome: "COMPLETED" },
    );
  }

  if (isNewPartnerAssignment) {
    resolutions.push({ sourceKey: `ADMIN_ASSIGN_PARTNER:${requestId}`, outcome: "COMPLETED" });
    createForPartner = {
      type: "PARTNER_CONFIRM_NEW_REQUEST",
      title: "새 요청을 확인해주세요",
      description: "배정된 서비스 요청을 확인하고 처리를 시작해주세요.",
      sourceKey: `PARTNER_CONFIRM_NEW_REQUEST:${requestId}`,
    };
  } else if (toStatus !== "신규" && toStatus !== serviceRequestCancelledStatus) {
    // 재배정이 아니라 그냥 진행이 된 것이므로 "신규 확인" 업무는 끝났다.
    // 취소로 가는 경우는 아래 취소 분기가 CANCELLED로 더 정확하게 닫는다.
    resolutions.push({ sourceKey: `PARTNER_CONFIRM_NEW_REQUEST:${requestId}`, outcome: "COMPLETED" });
  }

  if (toStatus === "확인 중") {
    createForPartner = {
      type: "PARTNER_REGISTER_QUOTE",
      title: "견적을 등록해주세요",
      description: "고객이 비교할 수 있도록 견적을 등록해주세요.",
      sourceKey: `PARTNER_REGISTER_QUOTE:${requestId}`,
    };
  }

  if (toStatus === "작업 중") {
    createForPartner = {
      type: "PARTNER_REGISTER_COMPLETION",
      title: "작업 완료를 등록해주세요",
      description: "작업이 끝나면 완료 처리해주세요.",
      sourceKey: `PARTNER_REGISTER_COMPLETION:${requestId}`,
    };
  }

  if (toStatus === "작업 완료") {
    resolutions.push(
      { sourceKey: `PARTNER_REGISTER_QUOTE:${requestId}`, outcome: "COMPLETED" },
      { sourceKey: `PARTNER_REGISTER_COMPLETION:${requestId}`, outcome: "COMPLETED" },
      { sourceKey: `CUSTOMER_SELECT_QUOTE:${requestId}`, outcome: "CANCELLED" },
    );
  }

  if (toStatus === serviceRequestCancelledStatus) {
    resolutions.push(
      { sourceKey: `PARTNER_CONFIRM_NEW_REQUEST:${requestId}`, outcome: "CANCELLED" },
      { sourceKey: `PARTNER_REGISTER_QUOTE:${requestId}`, outcome: "CANCELLED" },
      { sourceKey: `PARTNER_REGISTER_COMPLETION:${requestId}`, outcome: "CANCELLED" },
      { sourceKey: `CUSTOMER_SELECT_QUOTE:${requestId}`, outcome: "CANCELLED" },
      { sourceKey: `ADMIN_ASSIGN_PARTNER:${requestId}`, outcome: "CANCELLED" },
    );
  }

  return { resolutions, createForPartner };
}
