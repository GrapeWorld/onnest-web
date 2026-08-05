import { describe, expect, it } from "vitest";
import { formatWon } from "@/lib/currency";

describe("formatWon", () => {
  it("formats with comma separators", () => {
    expect(formatWon(1500000)).toBe("1,500,000");
  });

  it("formats zero", () => {
    expect(formatWon(0)).toBe("0");
  });
});
