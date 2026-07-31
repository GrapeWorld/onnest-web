import { z } from "zod";
import { serviceTypes, serviceRequestStatuses } from "@/data/serviceRequests";
import { optionalDateField } from "@/lib/dateField";

export const serviceRequestSchema = z.object({
  serviceTypes: z
    .array(z.enum(serviceTypes, { error: "선택할 수 없는 서비스입니다." }))
    .min(1, "필요한 서비스를 하나 이상 선택해주세요.")
    .max(serviceTypes.length),
  preferredDate: optionalDateField(),
  region: z.string().trim().min(1, "지역을 입력해주세요.").max(100),
  message: z.string().trim().max(500).optional().or(z.literal("")),
  contactName: z
    .string()
    .trim()
    .min(1, "연락받을 이름을 입력해주세요.")
    .max(50),
  contactPhone: z
    .string()
    .trim()
    .min(1, "연락처를 입력해주세요.")
    .regex(
      /^01[016-9][-\s]?\d{3,4}[-\s]?\d{4}$/,
      "휴대폰 번호 형식을 확인해주세요. (예: 010-1234-5678)",
    ),
  agreePrivacy: z.literal(true, {
    error: "연락처 전달에 동의해야 신청할 수 있습니다.",
  }),
});

export const serviceRequestPatchSchema = z.object({
  status: z.enum(serviceRequestStatuses).optional(),
  owner: z.string().trim().max(50).optional(),
});
