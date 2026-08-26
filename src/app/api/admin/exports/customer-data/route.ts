import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { adminExportRequestSchema } from "@/lib/adminExportSchema";
import { buildAdminExportWorkbook } from "@/lib/adminExport";
import { sanitizeExcelFilename, todayDateStamp } from "@/lib/excelSafety";

const errorMessageByCode: Record<string, string> = {
  NOTFOUND_CUSTOMER: "고객을 찾을 수 없습니다.",
  NOTFOUND_PROJECT: "프로젝트를 찾을 수 없습니다.",
  EMPTY_SELECTION: "포함할 데이터가 없습니다. 다른 데이터 종류를 선택해주세요.",
  TOO_MANY_ROWS: "선택한 범위의 데이터가 너무 많습니다. 기간이나 대상을 줄여주세요.",
};

/**
 * 관리자 고객/프로젝트 데이터 Excel 내보내기. 최고관리자만 실행할 수 있고,
 * 모든 시도(성공·실패)를 AdminDataExportHistory에 append-only로 남긴다 —
 * 실제 개인정보 내용은 이력에 복제하지 않는다.
 */
export async function POST(request: Request) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const limit = await checkRateLimit("adminExport", admin.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = adminExportRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }
  const data = parsed.data;
  const dateFrom = data.dateFrom ? new Date(`${data.dateFrom}T00:00:00.000Z`) : undefined;
  const dateTo = data.dateTo ? new Date(`${data.dateTo}T23:59:59.999Z`) : undefined;

  async function recordHistory(
    status: "SUCCESS" | "FAILED",
    extra: { includedSections?: string[]; rowCount?: number; fileSize?: number; failureReasonCode?: string },
  ) {
    try {
      await prisma.adminDataExportHistory.create({
        data: {
          actorId: admin!.id,
          actorName: admin!.name,
          actorEmail: admin!.email,
          exportType: data.exportType,
          customerId: data.customerId ?? null,
          projectId: data.projectId ?? null,
          dateFrom: dateFrom ?? null,
          dateTo: dateTo ?? null,
          includedSections: (extra.includedSections ?? data.sections).join(","),
          reason: data.reason,
          rowCount: extra.rowCount ?? null,
          fileSize: extra.fileSize ?? null,
          status,
          failureReasonCode: extra.failureReasonCode ?? null,
          completedAt: new Date(),
        },
      });
    } catch (error) {
      // 감사 이력 기록 실패가 실제 응답을 막지 않는다 — 다만 서버 로그에는 남긴다.
      console.error("[admin-export] failed to record export history", error);
    }
  }

  let result;
  try {
    result = await buildAdminExportWorkbook({
      exportType: data.exportType,
      customerId: data.customerId,
      projectId: data.projectId,
      dateFrom,
      dateTo,
      sections: data.sections,
      actor: { id: admin.id, name: admin.name, email: admin.email },
      reason: data.reason,
    });
  } catch (error) {
    console.error("[admin-export] workbook generation failed", error);
    await recordHistory("FAILED", { failureReasonCode: "GENERATION_ERROR" });
    return NextResponse.json({ error: "파일 생성에 실패했습니다. 잠시 후 다시 시도해주세요." }, { status: 500 });
  }

  if (!result.ok) {
    await recordHistory("FAILED", { failureReasonCode: result.errorCode });
    const status = result.errorCode === "NOTFOUND_CUSTOMER" || result.errorCode === "NOTFOUND_PROJECT" ? 404 : 400;
    return NextResponse.json(
      { error: errorMessageByCode[result.errorCode] ?? "내보내기에 실패했습니다." },
      { status },
    );
  }

  await recordHistory("SUCCESS", {
    includedSections: result.includedSections,
    rowCount: result.rowCount,
    fileSize: result.buffer.byteLength,
  });

  const filename = sanitizeExcelFilename(
    `onnest-${data.exportType === "CUSTOMER" ? "customer" : "project"}-data-${todayDateStamp()}.xlsx`,
  );

  return new NextResponse(new Uint8Array(result.buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
