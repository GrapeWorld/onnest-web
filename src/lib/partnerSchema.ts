import { z } from "zod";
import { serviceTypes } from "@/data/serviceRequests";

export const createPartnerSchema = z.object({
  name: z.string().trim().min(1, "업체명을 입력해주세요.").max(80),
  serviceType: z.enum(serviceTypes, { error: "서비스 유형을 선택해주세요." }),
  contactName: z.string().trim().max(50).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  memo: z.string().trim().max(500).optional().or(z.literal("")),
});

export const updatePartnerSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  serviceType: z.enum(serviceTypes).optional(),
  contactName: z.string().trim().max(50).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(30).optional().or(z.literal("")),
  memo: z.string().trim().max(500).optional().or(z.literal("")),
  active: z.boolean().optional(),
});
