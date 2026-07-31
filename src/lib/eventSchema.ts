import { z } from "zod";
import { requiredDateField } from "@/lib/dateField";

export const eventSchema = z.object({
  title: z.string().trim().min(1, "일정 이름을 입력해주세요.").max(100),
  date: requiredDateField("날짜를 입력해주세요."),
  memo: z.string().trim().max(300).optional().or(z.literal("")),
});

export const eventPatchSchema = z.object({ done: z.boolean() });
