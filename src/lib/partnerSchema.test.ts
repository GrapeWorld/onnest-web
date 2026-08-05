import { describe, expect, it } from "vitest";
import { createPartnerSchema, updatePartnerSchema } from "@/lib/partnerSchema";

describe("createPartnerSchema", () => {
  it("accepts a minimal valid partner", () => {
    const result = createPartnerSchema.safeParse({
      name: "온네스트 이사",
      serviceType: "이사",
    });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = createPartnerSchema.safeParse({
      name: "",
      serviceType: "이사",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a service type outside the known list", () => {
    const result = createPartnerSchema.safeParse({
      name: "온네스트 이사",
      serviceType: "택배",
    });
    expect(result.success).toBe(false);
  });

  it("accepts optional contact fields", () => {
    const result = createPartnerSchema.safeParse({
      name: "온네스트 청소",
      serviceType: "입주청소",
      contactName: "김담당",
      contactPhone: "010-1234-5678",
      memo: "주말 가능",
    });
    expect(result.success).toBe(true);
  });
});

describe("updatePartnerSchema", () => {
  it("accepts a partial active-only toggle", () => {
    const result = updatePartnerSchema.safeParse({ active: false });
    expect(result.success).toBe(true);
  });

  it("accepts an empty object (no-op update)", () => {
    const result = updatePartnerSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects an invalid service type", () => {
    const result = updatePartnerSchema.safeParse({ serviceType: "택배" });
    expect(result.success).toBe(false);
  });
});
