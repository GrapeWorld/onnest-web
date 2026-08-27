import { describe, expect, it } from "vitest";
import { getServiceRequestActionItemPlan } from "@/lib/serviceRequestActionItems";

describe("getServiceRequestActionItemPlan", () => {
  it("새 업체 배정 시 ADMIN_ASSIGN_PARTNER를 닫고 PARTNER_CONFIRM_NEW_REQUEST를 연다", () => {
    const plan = getServiceRequestActionItemPlan({
      requestId: "req-1",
      toStatus: "신규",
      hadPendingCancelRequest: false,
      isNewPartnerAssignment: true,
    });
    expect(plan.resolutions).toContainEqual({
      sourceKey: "ADMIN_ASSIGN_PARTNER:req-1",
      outcome: "COMPLETED",
    });
    expect(plan.createForPartner?.type).toBe("PARTNER_CONFIRM_NEW_REQUEST");
    expect(plan.createForPartner?.sourceKey).toBe("PARTNER_CONFIRM_NEW_REQUEST:req-1");
  });

  it("업체가 확인 중으로 넘기면 신규 확인 업무를 닫고 견적 등록 업무를 연다", () => {
    const plan = getServiceRequestActionItemPlan({
      requestId: "req-1",
      toStatus: "확인 중",
      hadPendingCancelRequest: false,
      isNewPartnerAssignment: false,
    });
    expect(plan.resolutions).toContainEqual({
      sourceKey: "PARTNER_CONFIRM_NEW_REQUEST:req-1",
      outcome: "COMPLETED",
    });
    expect(plan.createForPartner?.type).toBe("PARTNER_REGISTER_QUOTE");
  });

  it("작업 중으로 넘기면 작업 완료 등록 업무를 연다", () => {
    const plan = getServiceRequestActionItemPlan({
      requestId: "req-1",
      toStatus: "작업 중",
      hadPendingCancelRequest: false,
      isNewPartnerAssignment: false,
    });
    expect(plan.createForPartner?.type).toBe("PARTNER_REGISTER_COMPLETION");
  });

  it("작업 완료로 넘기면 견적 등록·완료 등록 업무를 닫고 고객의 견적 선택 업무를 취소한다", () => {
    const plan = getServiceRequestActionItemPlan({
      requestId: "req-1",
      toStatus: "작업 완료",
      hadPendingCancelRequest: false,
      isNewPartnerAssignment: false,
    });
    expect(plan.resolutions).toContainEqual({
      sourceKey: "PARTNER_REGISTER_QUOTE:req-1",
      outcome: "COMPLETED",
    });
    expect(plan.resolutions).toContainEqual({
      sourceKey: "PARTNER_REGISTER_COMPLETION:req-1",
      outcome: "COMPLETED",
    });
    expect(plan.resolutions).toContainEqual({
      sourceKey: "CUSTOMER_SELECT_QUOTE:req-1",
      outcome: "CANCELLED",
    });
    expect(plan.createForPartner).toBeUndefined();
  });

  it("취소로 넘기면 업체·관리자 관련 업무를 전부 취소한다", () => {
    const plan = getServiceRequestActionItemPlan({
      requestId: "req-1",
      toStatus: "취소",
      hadPendingCancelRequest: false,
      isNewPartnerAssignment: false,
    });
    const sourceKeys = plan.resolutions.map((r) => r.sourceKey);
    expect(sourceKeys).toEqual(
      expect.arrayContaining([
        "PARTNER_CONFIRM_NEW_REQUEST:req-1",
        "PARTNER_REGISTER_QUOTE:req-1",
        "PARTNER_REGISTER_COMPLETION:req-1",
        "CUSTOMER_SELECT_QUOTE:req-1",
        "ADMIN_ASSIGN_PARTNER:req-1",
      ]),
    );
    expect(plan.resolutions.every((r) => r.outcome === "CANCELLED")).toBe(true);
  });

  it("취소 요청을 처리하는 전환이면 업체·관리자 취소요청 처리 업무를 완료로 닫는다", () => {
    const plan = getServiceRequestActionItemPlan({
      requestId: "req-1",
      toStatus: "작업 예정",
      hadPendingCancelRequest: true,
      isNewPartnerAssignment: false,
    });
    expect(plan.resolutions).toContainEqual({
      sourceKey: "PARTNER_HANDLE_CANCEL_REQUEST:req-1",
      outcome: "COMPLETED",
    });
    expect(plan.resolutions).toContainEqual({
      sourceKey: "ADMIN_HANDLE_CANCEL_REQUEST:req-1",
      outcome: "COMPLETED",
    });
  });
});
