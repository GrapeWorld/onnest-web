import { describe, expect, it } from "vitest";
import { isValidStatusTransition, getValidNextStatuses } from "@/lib/serviceRequestStatus";
import { serviceRequestStatuses } from "@/data/serviceRequests";

describe("isValidStatusTransition", () => {
  it("allows moving to the immediate next status", () => {
    expect(isValidStatusTransition("신규", "확인 중")).toBe(true);
  });

  it("allows skipping several steps forward", () => {
    expect(isValidStatusTransition("신규", "작업 예정")).toBe(true);
    expect(isValidStatusTransition("확인 중", "작업 완료")).toBe(true);
  });

  it("blocks moving backward by one step", () => {
    expect(isValidStatusTransition("상담 완료", "확인 중")).toBe(false);
  });

  it("blocks moving backward by several steps", () => {
    expect(isValidStatusTransition("작업 예정", "신규")).toBe(false);
  });

  it("blocks re-saving the same status", () => {
    expect(isValidStatusTransition("확인 중", "확인 중")).toBe(false);
  });

  it("allows cancelling from any non-terminal status", () => {
    for (const status of ["신규", "확인 중", "상담 완료", "견적 전달", "작업 예정", "작업 중"] as const) {
      expect(isValidStatusTransition(status, "취소")).toBe(true);
    }
  });

  it("blocks any transition out of 작업 완료 (terminal)", () => {
    for (const status of serviceRequestStatuses) {
      expect(isValidStatusTransition("작업 완료", status)).toBe(false);
    }
  });

  it("blocks any transition out of 취소 (terminal)", () => {
    for (const status of serviceRequestStatuses) {
      expect(isValidStatusTransition("취소", status)).toBe(false);
    }
  });
});

describe("getValidNextStatuses", () => {
  it("returns every later status plus 취소 for 신규", () => {
    expect(getValidNextStatuses("신규")).toEqual([
      "확인 중",
      "상담 완료",
      "견적 전달",
      "작업 예정",
      "작업 중",
      "작업 완료",
      "취소",
    ]);
  });

  it("returns 작업 중, 작업 완료, and 취소 for 작업 예정", () => {
    expect(getValidNextStatuses("작업 예정")).toEqual(["작업 중", "작업 완료", "취소"]);
  });

  it("returns only 취소 for 작업 중 (last non-terminal step)", () => {
    expect(getValidNextStatuses("작업 중")).toEqual(["작업 완료", "취소"]);
  });

  it("returns an empty list for terminal statuses", () => {
    expect(getValidNextStatuses("작업 완료")).toEqual([]);
    expect(getValidNextStatuses("취소")).toEqual([]);
  });
});
