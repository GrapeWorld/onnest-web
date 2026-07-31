import { z } from "zod";
import { allowedHandoverItems } from "@/data/handoverRules";

export const handoverSchema = z.object({
  summary: z
    .string()
    .trim()
    .min(1, "생활 정보를 입력해주세요.")
    .max(2000, "2000자를 넘을 수 없습니다."),
  items: z
    .array(
      z.object({
        label: z.enum(allowedHandoverItems as [string, ...string[]]),
        note: z.string().trim().max(500),
      }),
    )
    .max(allowedHandoverItems.length),
});

export type HandoverInput = z.infer<typeof handoverSchema>;
