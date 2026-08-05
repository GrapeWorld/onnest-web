import { describe, expect, it } from "vitest";
import { isAdmin, isSuperAdmin } from "@/lib/auth";

describe("isAdmin", () => {
  it("returns true for super", () => {
    expect(isAdmin({ adminRole: "super" })).toBe(true);
  });
  it("returns true for viewer", () => {
    expect(isAdmin({ adminRole: "viewer" })).toBe(true);
  });
  it("returns false for null", () => {
    expect(isAdmin({ adminRole: null })).toBe(false);
  });
  it("returns false for an unknown value", () => {
    expect(isAdmin({ adminRole: "not-a-role" })).toBe(false);
  });
});

describe("isSuperAdmin", () => {
  it("returns true only for super", () => {
    expect(isSuperAdmin({ adminRole: "super" })).toBe(true);
  });
  it("returns false for viewer", () => {
    expect(isSuperAdmin({ adminRole: "viewer" })).toBe(false);
  });
  it("returns false for null", () => {
    expect(isSuperAdmin({ adminRole: null })).toBe(false);
  });
});
