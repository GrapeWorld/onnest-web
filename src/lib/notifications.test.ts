import { describe, expect, it } from "vitest";
import { notificationFallbackPath, resolveNotificationPath } from "@/lib/notifications";

const customer = { adminRole: null, memberType: "CUSTOMER" };
const partnerStaff = { adminRole: null, memberType: "PARTNER" };
const admin = { adminRole: "super", memberType: "CUSTOMER" };
const viewerAdmin = { adminRole: "viewer", memberType: "CUSTOMER" };

describe("notificationFallbackPath", () => {
  it("고객은 /my로 보낸다", () => {
    expect(notificationFallbackPath(customer)).toBe("/my");
  });

  it("업체 구성원은 /partner로 보낸다", () => {
    expect(notificationFallbackPath(partnerStaff)).toBe("/partner");
  });

  it("최고관리자는 /admin으로 보낸다", () => {
    expect(notificationFallbackPath(admin)).toBe("/admin");
  });

  it("조회전용 관리자도 /admin으로 보낸다", () => {
    expect(notificationFallbackPath(viewerAdmin)).toBe("/admin");
  });

  it("adminRole이 있으면 memberType이 PARTNER여도 /admin을 우선한다", () => {
    expect(notificationFallbackPath({ adminRole: "super", memberType: "PARTNER" })).toBe("/admin");
  });
});

describe("resolveNotificationPath", () => {
  it("같은 출처 상대경로는 그대로 통과시킨다", () => {
    expect(resolveNotificationPath("/my/service-requests", customer)).toBe(
      "/my/service-requests",
    );
  });

  it("외부 절대 URL은 역할별 기본 경로로 대체한다", () => {
    expect(resolveNotificationPath("https://evil.example.com", customer)).toBe("/my");
  });

  it("protocol-relative 경로(//evil.com)는 역할별 기본 경로로 대체한다", () => {
    expect(resolveNotificationPath("//evil.com", partnerStaff)).toBe("/partner");
  });

  it("역슬래시가 섞인 경로는 역할별 기본 경로로 대체한다", () => {
    expect(resolveNotificationPath("/\\evil.com", admin)).toBe("/admin");
  });

  it("빈 값은 역할별 기본 경로로 대체한다", () => {
    expect(resolveNotificationPath("", customer)).toBe("/my");
  });
});
