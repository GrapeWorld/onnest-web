import { describe, expect, it } from "vitest";
import { projectWizardSchema } from "@/lib/projectWizardSchema";

function baseInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    spaceCategory: "residential",
    spaceSubtype: "apartment",
    addressPending: false,
    address: "서울시 강남구 테헤란로",
    addressDetail: "",
    unitNumber: "",
    transactionType: "jeonse",
    details: {},
    projectStage: "searching",
    scheduleUndecided: false,
    moveInDate: "",
    contractDate: "",
    name: "테스트 프로젝트",
    budget: "",
    ...overrides,
  };
}

describe("projectWizardSchema", () => {
  it("accepts a valid residential jeonse submission", () => {
    const result = projectWizardSchema.safeParse(baseInput());
    expect(result.success).toBe(true);
  });

  it("rejects jeonse/monthly_rent for non-residential categories (rule 1-3)", () => {
    const result = projectWizardSchema.safeParse(
      baseInput({
        spaceCategory: "office",
        spaceSubtype: "office",
        transactionType: "jeonse",
      }),
    );
    expect(result.success).toBe(false);
  });

  it("accepts purchase/lease/undecided for non-residential categories", () => {
    const result = projectWizardSchema.safeParse(
      baseInput({
        spaceCategory: "office",
        spaceSubtype: "office",
        transactionType: "lease",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects a subtype that doesn't belong to the chosen category", () => {
    const result = projectWizardSchema.safeParse(
      baseInput({
        spaceCategory: "residential",
        spaceSubtype: "factory", // industrial subtype under residential category
      }),
    );
    expect(result.success).toBe(false);
  });

  it("requires an address unless addressPending is true (rule 12)", () => {
    const missingAddress = projectWizardSchema.safeParse(
      baseInput({ address: "" }),
    );
    expect(missingAddress.success).toBe(false);

    const pending = projectWizardSchema.safeParse(
      baseInput({ address: "", addressPending: true }),
    );
    expect(pending.success).toBe(true);
  });

  it("does not require moveInDate/contractDate when scheduleUndecided is true (rule 13)", () => {
    const result = projectWizardSchema.safeParse(
      baseInput({
        scheduleUndecided: true,
        moveInDate: "",
        contractDate: "",
      }),
    );
    expect(result.success).toBe(true);
  });

  it("rejects an unknown projectStage", () => {
    const result = projectWizardSchema.safeParse(
      baseInput({ projectStage: "not_a_real_stage" }),
    );
    expect(result.success).toBe(false);
  });
});
