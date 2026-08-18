import { describe, expect, it } from "vitest";
import { getCustomerNotificationCopy } from "@/lib/serviceRequestNotifications";

describe("getCustomerNotificationCopy", () => {
  it.each(["확인 중", "취소", "작업 완료"] as const)(
    "returns notification copy for the important transition %s",
    (status) => {
      const copy = getCustomerNotificationCopy(status);
      expect(copy).toBeDefined();
      expect(copy?.subject).toBeTruthy();
      expect(copy?.body).toBeTruthy();
    },
  );

  it.each(["신규", "상담 완료", "견적 전달", "작업 예정"] as const)(
    "does not notify for the intermediate status %s (avoids email fatigue)",
    (status) => {
      expect(getCustomerNotificationCopy(status)).toBeUndefined();
    },
  );
});
