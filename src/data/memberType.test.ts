import { describe, expect, it } from "vitest";
import { getMemberClassification } from "@/data/memberType";

describe("getMemberClassification", () => {
  it("classifies super admins as ADMIN regardless of memberType", () => {
    expect(
      getMemberClassification({ adminRole: "super", memberType: "PARTNER" }),
    ).toBe("ADMIN");
  });

  it("classifies viewer admins as ADMIN regardless of memberType", () => {
    expect(
      getMemberClassification({ adminRole: "viewer", memberType: "CUSTOMER" }),
    ).toBe("ADMIN");
  });

  it("classifies non-admins with memberType PARTNER as PARTNER", () => {
    expect(
      getMemberClassification({ adminRole: null, memberType: "PARTNER" }),
    ).toBe("PARTNER");
  });

  it("classifies non-admins with memberType CUSTOMER as CUSTOMER", () => {
    expect(
      getMemberClassification({ adminRole: null, memberType: "CUSTOMER" }),
    ).toBe("CUSTOMER");
  });

  it("falls back to CUSTOMER once admin access is revoked (memberType is preserved)", () => {
    expect(
      getMemberClassification({ adminRole: null, memberType: "CUSTOMER" }),
    ).toBe("CUSTOMER");
    expect(
      getMemberClassification({ adminRole: null, memberType: "PARTNER" }),
    ).toBe("PARTNER");
  });
});
