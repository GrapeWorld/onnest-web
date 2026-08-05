import { describe, expect, it } from "vitest";
import { isDeleteApproved } from "@/lib/oauth/deleteApproval";

describe("isDeleteApproved", () => {
  it("returns false when undefined", () => {
    expect(isDeleteApproved(undefined)).toBe(false);
  });

  it("returns true within the 5-minute window", () => {
    expect(isDeleteApproved(Date.now() - 30 * 1000)).toBe(true);
  });

  it("returns false once the window has passed", () => {
    expect(isDeleteApproved(Date.now() - 6 * 60 * 1000)).toBe(false);
  });
});
