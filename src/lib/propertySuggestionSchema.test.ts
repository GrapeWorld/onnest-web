import { describe, expect, it } from "vitest";
import { adminPropertySuggestionSchema, propertySuggestionResponseSchema } from "@/lib/propertySuggestionSchema";

const validInput = {
  sourceUrl: "https://fin.land.naver.com/complexes/123",
  title: "거제 아파트",
  address: "경상남도 거제시",
  transactionType: "전세",
  deposit: 200_000_000,
  sharedReason: "희망 지역과 예산에 맞는 매물입니다.",
};

describe("adminPropertySuggestionSchema", () => {
  it("accepts a valid admin suggestion input", () => {
    const parsed = adminPropertySuggestionSchema.safeParse(validInput);
    expect(parsed.success).toBe(true);
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "file:///etc/passwd"])(
    "rejects an unsafe URL scheme %s",
    (sourceUrl) => {
      const parsed = adminPropertySuggestionSchema.safeParse({ ...validInput, sourceUrl });
      expect(parsed.success).toBe(false);
    },
  );

  it("rejects a missing title", () => {
    const parsed = adminPropertySuggestionSchema.safeParse({ ...validInput, title: "" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a transaction type outside the shared candidate-property set", () => {
    const parsed = adminPropertySuggestionSchema.safeParse({ ...validInput, transactionType: "경매" });
    expect(parsed.success).toBe(false);
  });

  it("rejects a negative price", () => {
    const parsed = adminPropertySuggestionSchema.safeParse({ ...validInput, price: -1 });
    expect(parsed.success).toBe(false);
  });
});

describe("propertySuggestionResponseSchema", () => {
  it.each(["INTERESTED", "ON_HOLD", "NOT_INTERESTED"])("accepts customer-settable status %s", (customerStatus) => {
    const parsed = propertySuggestionResponseSchema.safeParse({ customerStatus });
    expect(parsed.success).toBe(true);
  });

  it.each(["NEW", "VIEWED", "SAVED", "EXPIRED"])("rejects system-managed status %s", (customerStatus) => {
    const parsed = propertySuggestionResponseSchema.safeParse({ customerStatus });
    expect(parsed.success).toBe(false);
  });

  it("accepts an optional customer memo", () => {
    const parsed = propertySuggestionResponseSchema.safeParse({
      customerStatus: "INTERESTED",
      customerMemo: "방문 예약해봐야겠어요.",
    });
    expect(parsed.success).toBe(true);
  });
});
