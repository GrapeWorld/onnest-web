import { describe, expect, it } from "vitest";
import { isPartnerStaff } from "@/lib/partnerAuth";

describe("isPartnerStaff", () => {
  it("returns true for a PARTNER member with a connected partnerId", () => {
    expect(isPartnerStaff({ memberType: "PARTNER", partnerId: "partner-1" })).toBe(true);
  });

  it("returns false for a CUSTOMER member", () => {
    expect(isPartnerStaff({ memberType: "CUSTOMER", partnerId: null })).toBe(false);
  });

  it("returns false for a PARTNER member without a connected partnerId", () => {
    expect(isPartnerStaff({ memberType: "PARTNER", partnerId: null })).toBe(false);
  });
});
