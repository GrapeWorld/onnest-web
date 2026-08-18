import { describe, expect, it } from "vitest";
import { getServiceRequestNextAction } from "@/lib/serviceRequestCustomerView";

describe("getServiceRequestNextAction", () => {
  it.each([
    ["신규", "담당 업체를 확인하고 있습니다."],
    ["확인 중", "업체가 요청 내용을 확인하고 있습니다."],
    ["견적 전달", "도착한 견적을 비교하고 선택해주세요."],
    ["작업 예정", "업체와 작업 일정을 확인해주세요."],
    ["작업 중", "서비스가 진행 중입니다."],
    ["작업 완료", "서비스가 완료되었습니다."],
    ["취소", "신청이 취소되었습니다."],
  ] as const)("returns the right hint for %s", (status, expected) => {
    expect(getServiceRequestNextAction({ status })).toBe(expected);
  });

  it("prioritizes the cancel-requested hint over the underlying status", () => {
    expect(
      getServiceRequestNextAction({ status: "작업 예정", cancelRequestedAt: new Date() }),
    ).toBe("취소 요청을 확인하고 있습니다.");
  });

  it("prioritizes the no-partner-notice hint over the underlying status", () => {
    expect(
      getServiceRequestNextAction({ status: "신규", noPartnerNoticeSentAt: new Date() }),
    ).toBe("업체 연결이 지연되고 있어 계속 확인 중입니다. 다른 서비스 유형으로 다시 신청하거나 문의해주세요.");
  });

  it("prioritizes the cancel-requested hint over the no-partner-notice hint", () => {
    expect(
      getServiceRequestNextAction({
        status: "신규",
        cancelRequestedAt: new Date(),
        noPartnerNoticeSentAt: new Date(),
      }),
    ).toBe("취소 요청을 확인하고 있습니다.");
  });
});
