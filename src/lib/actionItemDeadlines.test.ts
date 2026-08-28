import { describe, expect, it } from "vitest";
import { getActionItemDeadlineWarning } from "@/lib/actionItemDeadlines";

const TODAY = new Date("2026-08-10T00:00:00.000Z");
const days = (n: number) => new Date(TODAY.getTime() + n * 24 * 60 * 60 * 1000);

describe("getActionItemDeadlineWarning", () => {
  it("아직 여유 있으면 null", () => {
    expect(getActionItemDeadlineWarning(days(2), TODAY)).toBeNull();
    expect(getActionItemDeadlineWarning(days(10), TODAY)).toBeNull();
  });

  it("마감 당일·D-1이면 DUE_SOON", () => {
    expect(getActionItemDeadlineWarning(days(0), TODAY)).toBe("DUE_SOON");
    expect(getActionItemDeadlineWarning(days(1), TODAY)).toBe("DUE_SOON");
  });

  it("마감이 지났으면 OVERDUE", () => {
    expect(getActionItemDeadlineWarning(days(-1), TODAY)).toBe("OVERDUE");
    expect(getActionItemDeadlineWarning(days(-30), TODAY)).toBe("OVERDUE");
  });
});
