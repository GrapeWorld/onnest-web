import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { sanitizeExcelCell } from "@/lib/excelSafety";
import { getPropertySourceLabel } from "@/lib/propertyUrl";
import { paymentTierLabels, type PaymentTier } from "@/data/paymentTier";
import { memberStatusLabels, type MemberStatus } from "@/data/memberStatus";
import { propertySuggestionCustomerStatusLabels } from "@/data/propertySuggestion";
import {
  adminExportSectionLabels,
  projectScopeUnsupportedSections,
  ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
  type AdminExportSection,
  type AdminExportType,
} from "@/data/adminExport";

export type AdminExportInput = {
  exportType: AdminExportType;
  customerId?: string;
  projectId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sections: AdminExportSection[];
  actor: { id: string; name: string; email: string };
  reason: string;
};

export type AdminExportResult =
  | {
      ok: true;
      buffer: Buffer;
      rowCount: number;
      includedSections: AdminExportSection[];
    }
  | { ok: false; errorCode: "NOTFOUND_CUSTOMER" | "NOTFOUND_PROJECT" | "EMPTY_SELECTION" | "TOO_MANY_ROWS" };

type ColumnDef<T> = {
  header: string;
  width?: number;
  type?: "date" | "number";
  value: (row: T) => string | number | Date | null | undefined;
};

function addSheet<T>(workbook: ExcelJS.Workbook, name: string, columns: ColumnDef<T>[], rows: T[]) {
  const sheet = workbook.addWorksheet(name.slice(0, 31));
  sheet.columns = columns.map((column) => ({ header: column.header, width: column.width ?? 22 }));
  sheet.getRow(1).font = { bold: true };

  for (const row of rows) {
    const values = columns.map((column) => {
      const raw = column.value(row);
      if (column.type === "date") return raw instanceof Date ? raw : null;
      if (column.type === "number") return typeof raw === "number" ? raw : null;
      return sanitizeExcelCell(raw as string | number | null | undefined);
    });
    sheet.addRow(values);
  }

  columns.forEach((column, index) => {
    const col = sheet.getColumn(index + 1);
    if (column.type === "date") col.numFmt = "yyyy-mm-dd";
    if (column.type === "number") col.numFmt = "#,##0";
  });

  return sheet.rowCount - 1;
}

const uploaderRoleLabel: Record<string, string> = { CUSTOMER: "고객", PARTNER: "업체" };
const senderRoleLabel: Record<string, string> = { CUSTOMER: "고객", ADMIN: "관리자" };
const visibilityLabel: Record<string, string> = { private: "비공개", link: "링크 공개" };
const moderationStatusLabel: Record<string, string> = {
  pending: "검토 대기",
  approved: "승인",
  revision_requested: "수정 요청",
  hidden: "비공개 처리",
};

/**
 * 관리자용 고객/프로젝트 Excel 내보내기. 실제 데이터가 있는 시트만
 * 생성하고("프로젝트 변경 이력"·"업체 배정 이력"은 신뢰할 이력이 없어
 * 애초에 이 함수가 지원하는 섹션 목록에 없다), 관리자 내부 메모·인증정보
 * 원본은 어떤 섹션에서도 절대 select하지 않는다.
 */
export async function buildAdminExportWorkbook(input: AdminExportInput): Promise<AdminExportResult> {
  const requestedSections = new Set(input.sections);
  if (input.exportType === "PROJECT") {
    for (const unsupported of projectScopeUnsupportedSections) requestedSections.delete(unsupported);
  }
  if (requestedSections.size === 0) return { ok: false, errorCode: "EMPTY_SELECTION" };

  // 이 내보내기가 다룰 프로젝트 id 목록과, 시트에 함께 보여줄 프로젝트명 맵을 먼저 확정한다.
  let projectIds: string[];
  let projectNameById = new Map<string, string>();
  let customer: { id: string; name: string; email: string; phone: string | null; status: string; createdAt: Date; lastLoginAt: Date | null; paymentTier: string } | null = null;

  if (input.exportType === "CUSTOMER") {
    if (!input.customerId) return { ok: false, errorCode: "NOTFOUND_CUSTOMER" };
    customer = await prisma.user.findUnique({
      where: { id: input.customerId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        paymentTier: true,
      },
    });
    if (!customer) return { ok: false, errorCode: "NOTFOUND_CUSTOMER" };

    const projects = await prisma.project.findMany({
      where: {
        userId: customer.id,
        ...(input.dateFrom || input.dateTo
          ? { createdAt: { gte: input.dateFrom, lte: input.dateTo } }
          : {}),
      },
      select: { id: true, name: true },
    });
    projectIds = projects.map((p) => p.id);
    projectNameById = new Map(projects.map((p) => [p.id, p.name]));
  } else {
    if (!input.projectId) return { ok: false, errorCode: "NOTFOUND_PROJECT" };
    const project = await prisma.project.findUnique({
      where: { id: input.projectId },
      select: { id: true, name: true },
    });
    if (!project) return { ok: false, errorCode: "NOTFOUND_PROJECT" };
    projectIds = [project.id];
    projectNameById = new Map([[project.id, project.name]]);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "ONNEST Admin";
  workbook.created = new Date();

  let totalRows = 0;
  const includedSections: AdminExportSection[] = [];

  // 시트를 실제로 만들었다면(요청됐고 구조적으로 지원되는 섹션이라면) 행이
  // 0건이어도 "포함됨"으로 기록한다 — 빈 데이터도 시트 구조 자체는
  // 유지해야 한다("고객 프로젝트가 아직 없음"과 "이 기능 자체가 없음"은
  // 다른 상태다).
  function track(section: AdminExportSection, rowCount: number) {
    includedSections.push(section);
    totalRows += rowCount;
  }

  if (requestedSections.has("CUSTOMER_SUMMARY") && customer) {
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.CUSTOMER_SUMMARY,
      [
        { header: "고객 ID", value: (u: typeof customer) => u!.id },
        { header: "이름", value: (u: typeof customer) => u!.name },
        { header: "이메일", value: (u: typeof customer) => u!.email },
        { header: "연락처", value: (u: typeof customer) => u!.phone ?? "" },
        {
          header: "회원 상태",
          value: (u: typeof customer) => memberStatusLabels[u!.status as MemberStatus] ?? u!.status,
        },
        { header: "가입일", type: "date", value: (u: typeof customer) => u!.createdAt },
        { header: "최근 로그인", type: "date", value: (u: typeof customer) => u!.lastLoginAt ?? null },
        {
          header: "이용 등급",
          value: (u: typeof customer) => paymentTierLabels[u!.paymentTier as PaymentTier] ?? u!.paymentTier,
        },
      ],
      [customer],
    );
    track("CUSTOMER_SUMMARY", rowCount);
  }

  if (requestedSections.has("PAYMENT_TIER_HISTORY") && customer) {
    const history = await prisma.paymentTierHistory.findMany({
      where: { userId: customer.id },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.PAYMENT_TIER_HISTORY,
      [
        { header: "변경 전 등급", value: (r: (typeof history)[number]) => paymentTierLabels[r.fromTier as PaymentTier] ?? r.fromTier },
        { header: "변경 후 등급", value: (r: (typeof history)[number]) => paymentTierLabels[r.toTier as PaymentTier] ?? r.toTier },
        { header: "사유", value: (r: (typeof history)[number]) => r.reason },
        { header: "처리 관리자", value: (r: (typeof history)[number]) => r.adminEmail },
        { header: "변경일", type: "date", value: (r: (typeof history)[number]) => r.createdAt },
      ],
      history,
    );
    track("PAYMENT_TIER_HISTORY", rowCount);
  }

  if (requestedSections.has("PROJECT")) {
    const projects = await prisma.project.findMany({
      where: { id: { in: projectIds } },
      select: {
        id: true,
        name: true,
        spaceType: true,
        address: true,
        moveInDate: true,
        projectStage: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.PROJECT,
      [
        { header: "프로젝트 ID", value: (p: (typeof projects)[number]) => p.id },
        { header: "프로젝트명", value: (p: (typeof projects)[number]) => p.name },
        { header: "공간 유형", value: (p: (typeof projects)[number]) => p.spaceType },
        { header: "주소", value: (p: (typeof projects)[number]) => p.address ?? "" },
        { header: "입주 예정일", type: "date", value: (p: (typeof projects)[number]) => p.moveInDate ?? null },
        { header: "현재 단계", value: (p: (typeof projects)[number]) => p.projectStage ?? "" },
        { header: "생성일", type: "date", value: (p: (typeof projects)[number]) => p.createdAt },
        { header: "최근 수정일", type: "date", value: (p: (typeof projects)[number]) => p.updatedAt },
      ],
      projects,
    );
    track("PROJECT", rowCount);
  }

  if (requestedSections.has("SCHEDULE")) {
    const events = await prisma.projectEvent.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { date: "asc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.SCHEDULE,
      [
        { header: "프로젝트명", value: (e: (typeof events)[number]) => projectNameById.get(e.projectId) ?? "" },
        { header: "제목", value: (e: (typeof events)[number]) => e.title },
        { header: "날짜", type: "date", value: (e: (typeof events)[number]) => e.date },
        { header: "메모", value: (e: (typeof events)[number]) => e.memo ?? "" },
        { header: "완료 여부", value: (e: (typeof events)[number]) => (e.done ? "완료" : "미완료") },
      ],
      events,
    );
    track("SCHEDULE", rowCount);
  }

  if (requestedSections.has("CHECKLIST")) {
    const checks = await prisma.projectCheckItem.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: [{ projectId: "asc" }, { stepSlug: "asc" }],
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.CHECKLIST,
      [
        { header: "프로젝트명", value: (c: (typeof checks)[number]) => projectNameById.get(c.projectId) ?? "" },
        { header: "단계", value: (c: (typeof checks)[number]) => c.stepSlug },
        { header: "항목", value: (c: (typeof checks)[number]) => c.label },
        { header: "체크 여부", value: (c: (typeof checks)[number]) => (c.checked ? "완료" : "미완료") },
        { header: "최근 수정일", type: "date", value: (c: (typeof checks)[number]) => c.updatedAt },
      ],
      checks,
    );
    track("CHECKLIST", rowCount);
  }

  if (requestedSections.has("CANDIDATE_PROPERTY")) {
    const where =
      input.exportType === "CUSTOMER"
        ? { userId: customer!.id }
        : { linkedProjectId: input.projectId };
    const candidates = await prisma.candidateProperty.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.CANDIDATE_PROPERTY,
      [
        { header: "매물명", value: (c: (typeof candidates)[number]) => c.title },
        { header: "주소", value: (c: (typeof candidates)[number]) => c.address ?? "" },
        { header: "거래 유형", value: (c: (typeof candidates)[number]) => c.transactionType ?? "" },
        { header: "매매가", type: "number", value: (c: (typeof candidates)[number]) => c.price ?? undefined },
        { header: "보증금", type: "number", value: (c: (typeof candidates)[number]) => c.deposit ?? undefined },
        { header: "월세", type: "number", value: (c: (typeof candidates)[number]) => c.monthlyRent ?? undefined },
        { header: "전용면적(㎡)", type: "number", value: (c: (typeof candidates)[number]) => c.area ?? undefined },
        { header: "방 개수", type: "number", value: (c: (typeof candidates)[number]) => c.roomCount ?? undefined },
        { header: "상태", value: (c: (typeof candidates)[number]) => c.status },
        { header: "출처", value: (c: (typeof candidates)[number]) => getPropertySourceLabel(c.sourceUrl) },
        { header: "등록일", type: "date", value: (c: (typeof candidates)[number]) => c.createdAt },
      ],
      candidates,
    );
    track("CANDIDATE_PROPERTY", rowCount);
  }

  if (requestedSections.has("PROPERTY_SUGGESTION")) {
    const suggestions = await prisma.projectPropertySuggestion.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
      select: {
        projectId: true,
        title: true,
        address: true,
        transactionType: true,
        price: true,
        deposit: true,
        monthlyRent: true,
        customerStatus: true,
        sharedByName: true,
        withdrawnAt: true,
        createdAt: true,
      },
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.PROPERTY_SUGGESTION,
      [
        { header: "프로젝트명", value: (s: (typeof suggestions)[number]) => projectNameById.get(s.projectId) ?? "" },
        { header: "매물명", value: (s: (typeof suggestions)[number]) => s.title },
        { header: "주소", value: (s: (typeof suggestions)[number]) => s.address ?? "" },
        { header: "거래 유형", value: (s: (typeof suggestions)[number]) => s.transactionType ?? "" },
        { header: "매매가", type: "number", value: (s: (typeof suggestions)[number]) => s.price ?? undefined },
        { header: "보증금", type: "number", value: (s: (typeof suggestions)[number]) => s.deposit ?? undefined },
        { header: "월세", type: "number", value: (s: (typeof suggestions)[number]) => s.monthlyRent ?? undefined },
        {
          header: "고객 응답",
          value: (s: (typeof suggestions)[number]) =>
            propertySuggestionCustomerStatusLabels[s.customerStatus as keyof typeof propertySuggestionCustomerStatusLabels] ?? s.customerStatus,
        },
        { header: "공유한 관리자", value: (s: (typeof suggestions)[number]) => s.sharedByName },
        { header: "철회 여부", value: (s: (typeof suggestions)[number]) => (s.withdrawnAt ? "철회됨" : "") },
        { header: "공유일", type: "date", value: (s: (typeof suggestions)[number]) => s.createdAt },
      ],
      suggestions,
    );
    track("PROPERTY_SUGGESTION", rowCount);
  }

  let serviceRequestIds: string[] = [];
  if (requestedSections.has("SERVICE_REQUEST") || requestedSections.has("SERVICE_REQUEST_ACTIVITY") || requestedSections.has("QUOTE") || requestedSections.has("QUOTE_SELECTION")) {
    const serviceRequests = await prisma.serviceRequest.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
      select: {
        id: true,
        projectId: true,
        serviceType: true,
        createdAt: true,
        updatedAt: true,
        status: true,
        partner: { select: { name: true } },
        selectedQuote: { select: { title: true, amount: true } },
        cancelRequestedAt: true,
      },
    });
    serviceRequestIds = serviceRequests.map((r) => r.id);

    if (requestedSections.has("SERVICE_REQUEST")) {
      const rowCount = addSheet(
        workbook,
        adminExportSectionLabels.SERVICE_REQUEST,
        [
          { header: "신청 ID", value: (r: (typeof serviceRequests)[number]) => r.id },
          { header: "프로젝트명", value: (r: (typeof serviceRequests)[number]) => projectNameById.get(r.projectId) ?? "" },
          { header: "서비스 유형", value: (r: (typeof serviceRequests)[number]) => r.serviceType },
          { header: "신청일", type: "date", value: (r: (typeof serviceRequests)[number]) => r.createdAt },
          { header: "현재 상태", value: (r: (typeof serviceRequests)[number]) => r.status },
          { header: "담당 업체", value: (r: (typeof serviceRequests)[number]) => r.partner?.name ?? "" },
          {
            header: "선택 견적",
            value: (r: (typeof serviceRequests)[number]) =>
              r.selectedQuote ? `${r.selectedQuote.title} (${r.selectedQuote.amount.toLocaleString("ko-KR")}원)` : "",
          },
          { header: "최근 변경일", type: "date", value: (r: (typeof serviceRequests)[number]) => r.updatedAt },
          { header: "취소 요청 여부", value: (r: (typeof serviceRequests)[number]) => (r.cancelRequestedAt ? "예" : "아니오") },
          { header: "완료 여부", value: (r: (typeof serviceRequests)[number]) => (r.status === "작업 완료" ? "예" : "아니오") },
        ],
        serviceRequests,
      );
      track("SERVICE_REQUEST", rowCount);
    }
  }

  if (requestedSections.has("SERVICE_REQUEST_ACTIVITY")) {
    const activities = await prisma.serviceRequestActivity.findMany({
      where: { serviceRequestId: { in: serviceRequestIds } },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.SERVICE_REQUEST_ACTIVITY,
      [
        { header: "신청 ID", value: (a: (typeof activities)[number]) => a.serviceRequestId },
        { header: "활동", value: (a: (typeof activities)[number]) => a.action },
        { header: "메모", value: (a: (typeof activities)[number]) => a.note ?? "" },
        { header: "처리 주체", value: (a: (typeof activities)[number]) => actorRoleLabel(a.actorRole) },
        { header: "처리자", value: (a: (typeof activities)[number]) => a.actorName ?? a.actorEmail ?? "" },
        { header: "일시", type: "date", value: (a: (typeof activities)[number]) => a.createdAt },
      ],
      activities,
    );
    track("SERVICE_REQUEST_ACTIVITY", rowCount);
  }

  if (requestedSections.has("QUOTE")) {
    const quotes = await prisma.serviceRequestQuote.findMany({
      where: { serviceRequestId: { in: serviceRequestIds } },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.QUOTE,
      [
        { header: "신청 ID", value: (q: (typeof quotes)[number]) => q.serviceRequestId },
        { header: "견적명", value: (q: (typeof quotes)[number]) => q.title },
        { header: "설명", value: (q: (typeof quotes)[number]) => q.description ?? "" },
        { header: "금액", type: "number", value: (q: (typeof quotes)[number]) => q.amount },
        { header: "등록 업체 담당자", value: (q: (typeof quotes)[number]) => q.createdByName ?? "" },
        { header: "등록일", type: "date", value: (q: (typeof quotes)[number]) => q.createdAt },
      ],
      quotes,
    );
    track("QUOTE", rowCount);
  }

  if (requestedSections.has("QUOTE_SELECTION")) {
    const selections = await prisma.serviceRequest.findMany({
      where: { id: { in: serviceRequestIds }, selectedQuoteId: { not: null } },
      select: { id: true, selectedAt: true, selectedQuote: { select: { title: true, amount: true } } },
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.QUOTE_SELECTION,
      [
        { header: "신청 ID", value: (s: (typeof selections)[number]) => s.id },
        { header: "선택된 견적명", value: (s: (typeof selections)[number]) => s.selectedQuote?.title ?? "" },
        { header: "금액", type: "number", value: (s: (typeof selections)[number]) => s.selectedQuote?.amount },
        { header: "선택일", type: "date", value: (s: (typeof selections)[number]) => s.selectedAt ?? null },
      ],
      selections,
    );
    track("QUOTE_SELECTION", rowCount);
  }

  if (requestedSections.has("INQUIRY") && customer) {
    const inquiries = await prisma.inquiry.findMany({
      where: {
        userId: customer.id,
        ...(input.dateFrom || input.dateTo
          ? { createdAt: { gte: input.dateFrom, lte: input.dateTo } }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
      select: {
        id: true,
        type: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        assignee: { select: { name: true } },
      },
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.INQUIRY,
      [
        { header: "문의 ID", value: (i: (typeof inquiries)[number]) => i.id },
        { header: "유형", value: (i: (typeof inquiries)[number]) => i.type },
        { header: "상태", value: (i: (typeof inquiries)[number]) => i.status },
        { header: "접수일", type: "date", value: (i: (typeof inquiries)[number]) => i.createdAt },
        { header: "담당자", value: (i: (typeof inquiries)[number]) => i.assignee?.name ?? "" },
        { header: "최근 변경일", type: "date", value: (i: (typeof inquiries)[number]) => i.updatedAt },
      ],
      inquiries,
    );
    track("INQUIRY", rowCount);

    if (requestedSections.has("INQUIRY_MESSAGE")) {
      const messages = await prisma.inquiryMessage.findMany({
        where: { inquiryId: { in: inquiries.map((i) => i.id) } },
        orderBy: { createdAt: "asc" },
        take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
      });
      const messageRowCount = addSheet(
        workbook,
        adminExportSectionLabels.INQUIRY_MESSAGE,
        [
          { header: "문의 ID", value: (m: (typeof messages)[number]) => m.inquiryId },
          { header: "작성자", value: (m: (typeof messages)[number]) => senderRoleLabel[m.senderRole] ?? m.senderRole },
          { header: "이름", value: (m: (typeof messages)[number]) => m.senderName ?? "" },
          { header: "내용", value: (m: (typeof messages)[number]) => m.body },
          { header: "작성일", type: "date", value: (m: (typeof messages)[number]) => m.createdAt },
        ],
        messages,
      );
      track("INQUIRY_MESSAGE", messageRowCount);
    }
  }

  if (requestedSections.has("DOCUMENT")) {
    // storageKey·서명 URL은 절대 select하지 않는다(문서함 화면과 같은 화이트리스트 원칙).
    const documents = await prisma.document.findMany({
      where: { projectId: { in: projectIds } },
      orderBy: { createdAt: "desc" },
      take: ADMIN_EXPORT_MAX_ROWS_PER_SHEET,
      select: {
        projectId: true,
        filename: true,
        mimeType: true,
        size: true,
        createdAt: true,
        uploadedByRole: true,
        serviceRequestId: true,
      },
    });
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.DOCUMENT,
      [
        { header: "프로젝트명", value: (d: (typeof documents)[number]) => projectNameById.get(d.projectId) ?? "" },
        { header: "파일명", value: (d: (typeof documents)[number]) => d.filename },
        { header: "파일 종류", value: (d: (typeof documents)[number]) => d.mimeType },
        { header: "파일 크기(byte)", type: "number", value: (d: (typeof documents)[number]) => d.size },
        { header: "업로드 시각", type: "date", value: (d: (typeof documents)[number]) => d.createdAt },
        { header: "업로드 주체", value: (d: (typeof documents)[number]) => uploaderRoleLabel[d.uploadedByRole] ?? d.uploadedByRole },
        { header: "접근 범위", value: (d: (typeof documents)[number]) => (d.serviceRequestId ? "서비스 신청 첨부" : "프로젝트 문서함") },
      ],
      documents,
    );
    track("DOCUMENT", rowCount);
  }

  if (requestedSections.has("HANDOVER")) {
    const handovers = await prisma.handover.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        projectId: true,
        visibility: true,
        moderationStatus: true,
        createdAt: true,
        items: { select: { label: true, note: true } },
      },
    });
    const rows = handovers.flatMap((h) =>
      h.items.length > 0
        ? h.items.map((item) => ({ ...h, itemLabel: item.label, itemNote: item.note }))
        : [{ ...h, itemLabel: "", itemNote: "" }],
    );
    const rowCount = addSheet(
      workbook,
      adminExportSectionLabels.HANDOVER,
      [
        { header: "프로젝트명", value: (h: (typeof rows)[number]) => projectNameById.get(h.projectId) ?? "" },
        { header: "항목", value: (h: (typeof rows)[number]) => h.itemLabel },
        { header: "메모", value: (h: (typeof rows)[number]) => h.itemNote },
        { header: "공개 상태", value: (h: (typeof rows)[number]) => visibilityLabel[h.visibility] ?? h.visibility },
        { header: "검수 상태", value: (h: (typeof rows)[number]) => moderationStatusLabel[h.moderationStatus] ?? h.moderationStatus },
        { header: "작성일", type: "date", value: (h: (typeof rows)[number]) => h.createdAt },
      ],
      rows,
    );
    track("HANDOVER", rowCount);
  }

  if (totalRows > ADMIN_EXPORT_MAX_ROWS_PER_SHEET * 6) {
    return { ok: false, errorCode: "TOO_MANY_ROWS" };
  }

  // 내보내기 정보 시트 — 항상 마지막에 붙여 무엇을 어떤 조건으로 내려받았는지 파일 자체에 남긴다.
  addSheet(
    workbook,
    "내보내기 정보",
    [
      { header: "항목", width: 24, value: (r: [string, string]) => r[0] },
      { header: "내용", width: 60, value: (r: [string, string]) => r[1] },
    ],
    [
      ["생성 시각", new Date().toISOString()],
      ["생성 관리자", `${input.actor.name} (${input.actor.email})`],
      ["선택한 고객", customer ? `${customer.name} (${customer.id})` : "-"],
      ["선택한 프로젝트", input.exportType === "PROJECT" ? (projectNameById.get(input.projectId!) ?? "") : `${projectIds.length}건`],
      [
        "조회 기간",
        input.dateFrom || input.dateTo
          ? `${input.dateFrom?.toISOString().slice(0, 10) ?? "제한 없음"} ~ ${input.dateTo?.toISOString().slice(0, 10) ?? "제한 없음"}`
          : "전체 기간",
      ],
      ["포함된 데이터 종류", includedSections.map((s) => adminExportSectionLabels[s]).join(", ")],
      ["내보내기 사유", input.reason],
      ["파일 생성 버전", "1"],
      [
        "안내",
        "내보낸 파일에는 개인정보가 포함될 수 있습니다. 승인된 업무 목적으로만 사용하고, 사용이 끝나면 안전하게 삭제해 주세요.",
      ],
    ],
  );

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return {
    ok: true,
    buffer: Buffer.from(arrayBuffer),
    rowCount: totalRows,
    includedSections,
  };
}

function actorRoleLabel(role: string) {
  if (role === "ADMIN") return "관리자";
  if (role === "PARTNER") return "업체";
  if (role === "CUSTOMER") return "고객";
  return role;
}
