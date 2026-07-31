import { z } from "zod";
import { spaceTypes } from "@/data/inquiries";
import { optionalDateField } from "@/lib/dateField";

export const projectSchema = z.object({
  name: z.string().trim().min(1, "프로젝트 이름을 입력해주세요.").max(100),
  spaceType: z.enum(spaceTypes as [string, ...string[]], {
    error: "공간 유형을 선택해주세요.",
  }),
  address: z.string().trim().max(200).optional().or(z.literal("")),
  // <input type="date"> 값 (YYYY-MM-DD). 비워둘 수 있다.
  moveInDate: optionalDateField(),
  budget: z.string().trim().max(100).optional().or(z.literal("")),
});
