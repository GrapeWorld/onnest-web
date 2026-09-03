import { describe, expect, it } from "vitest";
import { customerNavItems, isCustomerNavItemActive, formatNavBadgeCount } from "@/data/customerNav";

describe("isCustomerNavItemActive", () => {
  const home = customerNavItems.find((item) => item.key === "home")!;
  const properties = customerNavItems.find((item) => item.key === "properties")!;
  const projects = customerNavItems.find((item) => item.key === "projects")!;

  it("홈은 정확히 /my일 때만 활성화된다", () => {
    expect(isCustomerNavItemActive(home, "/my")).toBe(true);
    expect(isCustomerNavItemActive(home, "/my/candidate-properties")).toBe(false);
    expect(isCustomerNavItemActive(home, "/my/services")).toBe(false);
  });

  it("다른 항목은 하위 경로에서도 활성화된다", () => {
    expect(isCustomerNavItemActive(properties, "/my/candidate-properties")).toBe(true);
    expect(isCustomerNavItemActive(properties, "/my/candidate-properties/abc123")).toBe(true);
    expect(isCustomerNavItemActive(properties, "/my/candidate-properties/abc123/edit")).toBe(true);
    expect(isCustomerNavItemActive(properties, "/my/services")).toBe(false);
  });

  it("프로젝트 상세·생성 경로에서도 프로젝트 탭이 활성화된다", () => {
    expect(isCustomerNavItemActive(projects, "/projects")).toBe(true);
    expect(isCustomerNavItemActive(projects, "/projects/new")).toBe(true);
    expect(isCustomerNavItemActive(projects, "/projects/abc123/services")).toBe(true);
  });
});

describe("formatNavBadgeCount", () => {
  it("99 이하는 그대로 표시한다", () => {
    expect(formatNavBadgeCount(0)).toBe("0");
    expect(formatNavBadgeCount(99)).toBe("99");
  });

  it("100 이상은 99+로 줄인다", () => {
    expect(formatNavBadgeCount(100)).toBe("99+");
    expect(formatNavBadgeCount(1000)).toBe("99+");
  });
});
