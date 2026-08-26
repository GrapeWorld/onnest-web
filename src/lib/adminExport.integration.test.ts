import { randomUUID } from "node:crypto";
import ExcelJS from "exceljs";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { buildAdminExportWorkbook } from "@/lib/adminExport";
import { adminExportSections, adminExportSectionLabels } from "@/data/adminExport";

/**
 * 실제(테스트 전용) DB에 데이터를 심고, 실제 exceljs로 워크북을 만든 뒤
 * 다시 exceljs로 읽어 검증한다 — xlsx는 내부적으로 압축된 zip이라, 버퍼를
 * 문자열로 그냥 검색해서는 "민감정보가 없다"를 증명할 수 없다. 반드시
 * 파싱해서 셀 값으로 확인해야 한다.
 */

const SECRET_PASSWORD_HASH = "bcrypt$secret-hash-must-never-leak";
const SECRET_ADMIN_MEMO = "관리자 전용 내부 메모 절대유출금지문자열";
const SECRET_STORAGE_KEY = "projects/secret-storage-key-must-never-leak.pdf";

async function seedScenario() {
  const suffix = randomUUID();
  const admin = await prisma.user.create({
    data: {
      email: `export-admin-${suffix}@example.com`,
      name: "테스트관리자",
      adminRole: "super",
      passwordHash: SECRET_PASSWORD_HASH,
    },
  });

  const customer = await prisma.user.create({
    data: {
      email: `export-customer-${suffix}@example.com`,
      name: "=SUM(A1:A10)", // 수식 주입 시도 문자열
      passwordHash: SECRET_PASSWORD_HASH,
      paymentTier: "PREMIUM",
    },
  });

  await prisma.paymentTierHistory.create({
    data: {
      userId: customer.id,
      fromTier: "FREE",
      toTier: "PREMIUM",
      reason: "상담 후 결제 확인",
      adminId: admin.id,
      adminEmail: admin.email,
    },
  });

  const project = await prisma.project.create({
    data: {
      userId: customer.id,
      name: "거제 이사 프로젝트",
      spaceType: "아파트",
      address: "+82-거제시 아주동", // 수식 주입 시도 문자열(+로 시작)
    },
  });

  await prisma.projectEvent.create({
    data: { projectId: project.id, title: "잔금일", date: new Date("2026-09-01") },
  });
  await prisma.projectCheckItem.create({
    data: { projectId: project.id, stepSlug: "move-in", label: "전입신고", checked: true },
  });

  await prisma.candidateProperty.create({
    data: {
      userId: customer.id,
      sourceUrl: "https://fin.land.naver.com/complexes/1",
      title: "@cmd|'/bin/bash'", // 수식 주입 시도 문자열
    },
  });

  await prisma.projectPropertySuggestion.create({
    data: {
      projectId: project.id,
      sourceUrl: "https://fin.land.naver.com/complexes/2",
      title: "공유매물",
      adminMemo: SECRET_ADMIN_MEMO,
      sharedById: admin.id,
      sharedByName: admin.name,
      sharedByEmail: admin.email,
    },
  });

  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      projectId: project.id,
      serviceType: "이사",
      region: "거제시",
      contactName: "고객",
      contactPhone: "010-0000-0000",
    },
  });
  await prisma.serviceRequestActivity.create({
    data: { serviceRequestId: serviceRequest.id, action: "STATUS_CHANGED", actorRole: "ADMIN", actorName: "테스트관리자" },
  });
  await prisma.serviceRequestQuote.create({
    data: { serviceRequestId: serviceRequest.id, title: "기본형", amount: 300000 },
  });

  const inquiry = await prisma.inquiry.create({
    data: {
      name: customer.name,
      email: customer.email,
      phone: "010-0000-0000",
      type: "이사",
      message: "문의합니다",
      userId: customer.id,
      privacyAgreedAt: new Date(),
    },
  });
  await prisma.inquiryMessage.create({
    data: { inquiryId: inquiry.id, senderRole: "CUSTOMER", body: "-DROP TABLE users", senderName: customer.name },
  });

  await prisma.document.create({
    data: {
      projectId: project.id,
      filename: "계약서.pdf",
      mimeType: "application/pdf",
      size: 1024,
      storageKey: SECRET_STORAGE_KEY,
      uploadedByRole: "CUSTOMER",
    },
  });

  const handover = await prisma.handover.create({
    data: { projectId: project.id, summary: "요약" },
  });
  await prisma.handoverItem.create({
    data: { handoverId: handover.id, label: "채광", note: "오전에 좋음" },
  });

  return { admin, customer, project };
}

async function readAllCellText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const chunks: string[] = [];
  workbook.eachSheet((sheet) => {
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value !== null && cell.value !== undefined) chunks.push(String(cell.value));
      });
    });
  });
  return chunks.join("\n");
}

describe("buildAdminExportWorkbook (integration)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("generates a real .xlsx with only the sheets that have data, excludes sensitive fields, and neutralizes formula-injection attempts", async () => {
    const { admin, customer, project } = await seedScenario();

    const result = await buildAdminExportWorkbook({
      exportType: "CUSTOMER",
      customerId: customer.id,
      sections: [...adminExportSections],
      actor: { id: admin.id, name: admin.name, email: admin.email },
      reason: "통합 테스트",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // 실제 .xlsx로 다시 열 수 있어야 한다.
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as unknown as ExcelJS.Buffer);
    const sheetNames = workbook.worksheets.map((s) => s.name);

    for (const section of result.includedSections) {
      expect(sheetNames).toContain(adminExportSectionLabels[section]);
    }
    expect(sheetNames).toContain("내보내기 정보");
    // 신뢰할 이력이 없어 지원하지 않는 시트는 만들어지지 않는다.
    expect(sheetNames.some((name) => name.includes("변경 이력") && name.includes("프로젝트"))).toBe(false);
    expect(sheetNames.some((name) => name.includes("업체 배정"))).toBe(false);

    const projectSheet = workbook.getWorksheet(adminExportSectionLabels.PROJECT)!;
    const headerRow = projectSheet.getRow(1).values as unknown[];
    expect(headerRow).toContain("프로젝트명");
    const dataRow = projectSheet.getRow(2).values as unknown[];
    expect(dataRow).toContain(project.name);

    const allText = await readAllCellText(result.buffer);

    // 수식 주입 시도 문자열은 원문 그대로가 아니라 작은따옴표가 붙은 텍스트로 저장된다.
    expect(allText).toContain("'=SUM(A1:A10)");
    expect(allText).not.toMatch(/(?<!')=SUM\(A1:A10\)/);
    expect(allText).toContain("'+82-거제시 아주동");
    expect(allText).toContain("'@cmd|'/bin/bash'");
    expect(allText).toContain("'-DROP TABLE users");

    // 민감정보는 파일 어디에도(파싱된 셀 텍스트 기준) 존재하지 않는다.
    expect(allText).not.toContain(SECRET_PASSWORD_HASH);
    expect(allText).not.toContain(SECRET_ADMIN_MEMO);
    expect(allText).not.toContain(SECRET_STORAGE_KEY);
  });

  it("returns NOTFOUND_CUSTOMER for a nonexistent customer id", async () => {
    const admin = await prisma.user.create({
      data: { email: `export-admin2-${randomUUID()}@example.com`, name: "관리자2", adminRole: "super" },
    });
    const result = await buildAdminExportWorkbook({
      exportType: "CUSTOMER",
      customerId: "does-not-exist",
      sections: ["CUSTOMER_SUMMARY"],
      actor: { id: admin.id, name: admin.name, email: admin.email },
      reason: "테스트",
    });
    expect(result).toEqual({ ok: false, errorCode: "NOTFOUND_CUSTOMER" });
  });

  it("produces an empty-but-structured sheet (not a crash) for a customer with no projects", async () => {
    const admin = await prisma.user.create({
      data: { email: `export-admin3-${randomUUID()}@example.com`, name: "관리자3", adminRole: "super" },
    });
    const customer = await prisma.user.create({
      data: { email: `export-empty-${randomUUID()}@example.com`, name: "빈고객" },
    });

    const result = await buildAdminExportWorkbook({
      exportType: "CUSTOMER",
      customerId: customer.id,
      sections: ["CUSTOMER_SUMMARY", "PROJECT"],
      actor: { id: admin.id, name: admin.name, email: admin.email },
      reason: "빈 프로젝트 테스트",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(result.buffer as unknown as ExcelJS.Buffer);
    const projectSheet = workbook.getWorksheet(adminExportSectionLabels.PROJECT)!;
    expect(projectSheet).toBeDefined();
    expect(projectSheet.rowCount).toBe(1); // 헤더만 있고 데이터 행은 없다.
  });
});
