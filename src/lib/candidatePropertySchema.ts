import { z } from "zod";
import {
  candidatePropertyTransactionTypes,
  candidatePropertyStatuses,
} from "@/data/candidateProperty";
import { isSafeExternalUrl } from "@/lib/propertyUrl";
import { optionalDateField } from "@/lib/dateField";

/** 원 단위 정수 금액. 음수·비현실적으로 큰 값을 막는다(견적 금액 검증과 같은 상한). */
const optionalWonAmount = z
  .number()
  .int()
  .min(0, "0 이상의 금액을 입력해주세요.")
  .max(100_000_000_000, "금액이 너무 큽니다.")
  .nullable()
  .optional();

export const candidatePropertySchema = z.object({
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
  memo: z.string().trim().max(2000).optional().or(z.literal("")),
  advantages: z.string().trim().max(2000).optional().or(z.literal("")),
  concerns: z.string().trim().max(2000).optional().or(z.literal("")),
  status: z.enum(candidatePropertyStatuses).optional(),
  // 관리자가 공유한 매물(ProjectPropertySuggestion)에서 이 폼을 미리 채워
  // 들어왔다면 그 id. 저장 성공 시 해당 공유 건을 SAVED로 연결하는 데만 쓴다.
  suggestionId: z.string().trim().min(1).optional(),
});

export type CandidatePropertyInput = z.infer<typeof candidatePropertySchema>;

export const propertyPreferenceSchema = z.object({
  desiredRegion: z.string().trim().max(200).optional().or(z.literal("")),
  transactionType: z.enum(candidatePropertyTransactionTypes).nullable().optional(),
  minBudget: optionalWonAmount,
  maxBudget: optionalWonAmount,
  minArea: z.number().min(0).max(100_000).nullable().optional(),
  minRooms: z.number().int().min(0).max(100).nullable().optional(),
  desiredMoveInDate: optionalDateField(),
  mustHave: z.string().trim().max(1000).optional().or(z.literal("")),
  niceToHave: z.string().trim().max(1000).optional().or(z.literal("")),
  commuteMemo: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type PropertyPreferenceInput = z.infer<typeof propertyPreferenceSchema>;
