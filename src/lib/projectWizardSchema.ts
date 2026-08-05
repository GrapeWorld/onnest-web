import { z } from "zod";
import {
  spaceCategories,
  subtypesByCategory,
  transactionOptionsByCategory,
  projectStages,
  type SpaceCategory,
} from "@/data/projectSpace";
import { optionalDateField } from "@/lib/dateField";

function isValidSubtype(category: SpaceCategory, subtype: string) {
  return subtypesByCategory[category].some((option) => option.value === subtype);
}

function isValidTransaction(category: SpaceCategory, type: string) {
  return transactionOptionsByCategory[category].includes(
    type as (typeof transactionOptionsByCategory)[SpaceCategory][number],
  );
}

/**
 * 새 프로젝트 만들기 위저드 전체(1~3단계)를 합친 스키마.
 *
 * 세부유형·거래유형은 대분류에 종속적이라 개별 필드 타입만으로는 검증할 수
 * 없다 — superRefine으로 조합 정합성을 확인한다(규칙 1~4).
 */
const projectWizardObjectSchema = z.object({
    // 1단계 — 공간 선택
    spaceCategory: z.enum(spaceCategories as [SpaceCategory, ...SpaceCategory[]], {
      error: "공간 대분류를 선택해주세요.",
    }),
    spaceSubtype: z.string().min(1, "세부 공간 유형을 선택해주세요."),
    addressPending: z.boolean().default(false),
    address: z.string().trim().max(200).optional().or(z.literal("")),
    addressDetail: z.string().trim().max(200).optional().or(z.literal("")),
    unitNumber: z.string().trim().max(50).optional().or(z.literal("")),

    // 2단계 — 거래 조건
    transactionType: z.string().min(1, "거래 유형을 선택해주세요."),
    // 거래유형·공간별 조건부 필드. 값을 미리 강요하지 않으므로(스펙: 선택
    // 입력) 필드 하나하나를 required로 만들지 않고, 알려진 키/문자열 값만
    // 받는 느슨한 레코드로 검증한다.
    details: z.record(z.string(), z.string()).default({}),

    // 3단계 — 일정 및 확인
    projectStage: z.enum(projectStages as [string, ...string[]], {
      error: "현재 진행 단계를 선택해주세요.",
    }),
    scheduleUndecided: z.boolean().default(false),
    moveInDate: optionalDateField(),
    contractDate: optionalDateField(),
    name: z.string().trim().min(1, "프로젝트 이름을 입력해주세요.").max(100),
    budget: z.string().trim().max(100).optional().or(z.literal("")),
});

export const projectWizardSchema = projectWizardObjectSchema.superRefine(
  (data, ctx) => {
    if (!isValidSubtype(data.spaceCategory, data.spaceSubtype)) {
      ctx.addIssue({
        code: "custom",
        path: ["spaceSubtype"],
        message: "선택한 공간 대분류에 맞지 않는 세부 유형입니다.",
      });
    }
    if (!isValidTransaction(data.spaceCategory, data.transactionType)) {
      ctx.addIssue({
        code: "custom",
        path: ["transactionType"],
        message: "선택한 공간 유형에서는 지원하지 않는 거래 방식입니다.",
      });
    }
    // 규칙 12: 주소 미정이면 주소 필수 검증을 해제한다.
    if (!data.addressPending && !data.address) {
      ctx.addIssue({
        code: "custom",
        path: ["address"],
        message: "주소를 입력하거나 '주소 미정'을 선택해주세요.",
      });
    }
  },
);

export type ProjectWizardInput = z.infer<typeof projectWizardSchema>;

/** 1단계만 통과했는지 확인할 때 쓴다(다음 버튼 활성화 등 단계별 부분 검증). */
export const spaceStepSchema = projectWizardObjectSchema.pick({
  spaceCategory: true,
  spaceSubtype: true,
  addressPending: true,
  address: true,
  addressDetail: true,
  unitNumber: true,
});

export const transactionStepSchema = projectWizardObjectSchema.pick({
  transactionType: true,
  details: true,
});
