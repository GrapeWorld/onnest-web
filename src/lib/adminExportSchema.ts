import { z } from "zod";
import { adminExportTypes, adminExportSections, ADMIN_EXPORT_MAX_DATE_RANGE_DAYS } from "@/data/adminExport";
import { optionalDateField, dateRangeSchema } from "@/lib/dateField";

export const adminExportRequestSchema = z
  .object({
    exportType: z.enum(adminExportTypes, { error: "내보낼 범위를 선택해주세요." }),
    customerId: z.string().trim().min(1).optional(),
    projectId: z.string().trim().min(1).optional(),
    dateFrom: optionalDateField(),
    dateTo: optionalDateField(),
    sections: z.array(z.enum(adminExportSections)).min(1, "포함할 데이터 종류를 하나 이상 선택해주세요."),
    reason: z.string().trim().min(1, "내보내기 사유를 입력해주세요.").max(500),
  })
  .superRefine((data, ctx) => {
    if (data.exportType === "CUSTOMER" && !data.customerId) {
      ctx.addIssue({ code: "custom", path: ["customerId"], message: "고객을 선택해주세요." });
    }
    if (data.exportType === "PROJECT" && !data.projectId) {
      ctx.addIssue({ code: "custom", path: ["projectId"], message: "프로젝트를 선택해주세요." });
    }
    dateRangeSchema("dateFrom", "dateTo", { maxRangeDays: ADMIN_EXPORT_MAX_DATE_RANGE_DAYS })(data, ctx);
  });

export type AdminExportRequestInput = z.infer<typeof adminExportRequestSchema>;
