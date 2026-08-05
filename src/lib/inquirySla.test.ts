import { describe, expect, it } from "vitest";
import { getInquiryWarning } from "@/lib/inquirySla";

const NOW = new Date("2026-08-10T00:00:00.000Z");
const daysAgo = (days: number) => new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("getInquiryWarning", () => {
  it("returns null for a closed (답변 완료) inquiry regardless of age", () => {
    const warning = getInquiryWarning(
      { status: "답변 완료", assigneeId: null, createdAt: daysAgo(30) },
      NOW,
    );
    expect(warning).toBeNull();
  });

  it("returns null when open, assigned, and reviewed within thresholds", () => {
    const warning = getInquiryWarning(
      { status: "검토 중", assigneeId: "admin-1", createdAt: daysAgo(1) },
      NOW,
    );
    expect(warning).toBeNull();
  });

  it("flags unassigned once past the unassigned threshold", () => {
    const warning = getInquiryWarning(
      { status: "검토 중", assigneeId: null, createdAt: daysAgo(2) },
      NOW,
    );
    expect(warning).toEqual({ unassigned: true, unreviewed: false, daysOpen: 2 });
  });

  it("does not flag unassigned before the threshold", () => {
    const warning = getInquiryWarning(
      { status: "검토 중", assigneeId: null, createdAt: daysAgo(1) },
      NOW,
    );
    expect(warning).toBeNull();
  });

  it("flags unreviewed once a 신규 inquiry passes the unreviewed threshold, even if assigned", () => {
    const warning = getInquiryWarning(
      { status: "신규", assigneeId: "admin-1", createdAt: daysAgo(3) },
      NOW,
    );
    expect(warning).toEqual({ unassigned: false, unreviewed: true, daysOpen: 3 });
  });

  it("does not flag unreviewed for non-신규 statuses even if old", () => {
    const warning = getInquiryWarning(
      { status: "파트너 배정", assigneeId: "admin-1", createdAt: daysAgo(10) },
      NOW,
    );
    expect(warning).toBeNull();
  });

  it("flags both simultaneously for an old, unassigned, 신규 inquiry", () => {
    const warning = getInquiryWarning(
      { status: "신규", assigneeId: null, createdAt: daysAgo(5) },
      NOW,
    );
    expect(warning).toEqual({ unassigned: true, unreviewed: true, daysOpen: 5 });
  });
});
