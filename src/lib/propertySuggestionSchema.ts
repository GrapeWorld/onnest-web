import { z } from "zod";
import { candidatePropertyTransactionTypes } from "@/data/candidateProperty";
import { propertySuggestionCustomerResponses } from "@/data/propertySuggestion";
import { isSafeExternalUrl } from "@/lib/propertyUrl";
import { optionalDateField } from "@/lib/dateField";

/** 원 단위 정수 금액. CandidateProperty와 같은 상한(견적 금액 검증과 동일 원칙). */
const optionalWonAmount = z
  .number()
  .int()
  .min(0, "0 이상의 금액을 입력해주세요.")
  .max(100_000_000_000, "금액이 너무 큽니다.")
  .nullable()
  .optional();

/** 관리자가 프로젝트에 매물을 공유할 때 입력하는 값. CandidateProperty와 같은 매물 필드 집합을 쓴다. */
export const adminPropertySuggestionSchema = z.object({
  sourceUrl: z
    .string()
    .trim()
    .min(1, "원본 매물 URL을 입력해주세요.")
    .max(2000)
    .refine(isSafeExternalUrl, {
      message: "http 또는 https로 시작하는 올바른 URL을 입력해주세요.",
    }),
  title: z.string().trim().min(1, "매물 이름 또는 별칭을 입력해주세요.").max(100),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  transactionType: z.enum(candidatePropertyTransactionTypes).nullable().optional(),
  price: optionalWonAmount,
  deposit: optionalWonAmount,
  monthlyRent: optionalWonAmount,
  area: z.number().min(0).max(100_000).nullable().optional(),
  roomCount: z.number().int().min(0).max(100).nullable().optional(),
  availableDate: optionalDateField(),
  sharedReason: z.string().trim().max(1000).optional().or(z.literal("")),
  cautionNote: z.string().trim().max(1000).optional().or(z.literal("")),
  adminMemo: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type AdminPropertySuggestionInput = z.infer<typeof adminPropertySuggestionSchema>;

/** 고객이 공유 매물에 응답할 때 보내는 값. NEW/VIEWED/SAVED/EXPIRED는 시스템 전용이라 여기서 받지 않는다. */
export const propertySuggestionResponseSchema = z.object({
  customerStatus: z.enum(propertySuggestionCustomerResponses),
  customerMemo: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type PropertySuggestionResponseInput = z.infer<typeof propertySuggestionResponseSchema>;
