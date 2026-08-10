import { z } from "zod";
import { serviceTypes } from "@/data/serviceRequests";

// 관리자가 업체 등록 시 함께 받아두는 정산·서류 대조용 정보. adminMemo와
// 같은 원칙으로 파트너 포털에는 절대 노출하지 않는다.
const businessVerificationFields = {
  businessRegistrationNumber: z.string().trim().max(30).optional().or(z.literal("")),
  bankName: z.string().trim().max(50).optional().or(z.literal("")),
  bankAccountHolder: z.string().trim().max(50).optional().or(z.literal("")),
  bankAccountNumber: z.string().trim().max(50).optional().or(z.literal("")),
};

export const createPartnerSchema = z.object({
  name: z.string().trim().min(1, "업체명을 입력해주세요.").max(80),
  serviceType: z.enum(serviceTypes, { error: "서비스 유형을 선택해주세요." }),
  contactName: z.string().trim().max(50).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  adminMemo: z.string().trim().max(500).optional().or(z.literal("")),
  ...businessVerificationFields,
});

export const updatePartnerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  serviceType: z.enum(serviceTypes).optional(),
  contactName: z.string().trim().max(50).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  adminMemo: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
  ...businessVerificationFields,
});
