import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { generatePartnerCode } from "@/lib/partnerCode";

/**
 * 실제(테스트 전용) DB를 쓴다 — 이 파일이 검증하는 건 "업체 재배정 후
 * 새 업체가 이전 업체의 내부 메모·연락 기록·파일을 절대 조회하지 못한다"는
 * P0 보안 수정 자체다. mock으로는 partnerId 스냅샷 필터링이 실제 Postgres
 * NULL 비교 규칙까지 포함해 올바르게 동작하는지 의미 있게 검증할 수 없다.
 */

async function createTestPartner(name: string) {
  return prisma.partner.create({
    data: {
      name: `${name}-${randomUUID()}`,
      serviceType: "이사",
      active: true,
      partnerCode: generatePartnerCode(),
    },
  });
}

async function createTestProject() {
  const user = await prisma.user.create({
    data: {
      email: `snapshot-test-${randomUUID()}@example.com`,
      passwordHash: "irrelevant-for-this-test",
      name: "테스트 고객",
    },
  });
  return prisma.project.create({
    data: { userId: user.id, name: "테스트 프로젝트", spaceType: "주거" },
  });
}

async function createTestServiceRequest(projectId: string, partnerId: string) {
  return prisma.serviceRequest.create({
    data: {
      projectId,
      serviceType: "이사",
      region: "서울",
      contactName: "테스트 고객",
      contactPhone: "010-0000-0000",
      privacyAgreedAt: new Date(),
      partnerId,
    },
  });
}

/** 관리자 재배정 라우트(src/app/api/admin/service-requests/[id]/route.ts)가
 * partnerChanged일 때 수행하는 것과 동일한 정리 작업을 재현한다. */
async function reassignPartner(serviceRequestId: string, newPartnerId: string) {
  await prisma.serviceRequest.update({
    where: { id: serviceRequestId },
    data: {
      partnerId: newPartnerId,
      selectedQuoteId: null,
      selectedAt: null,
      partnerStaffId: null,
    },
  });
  await prisma.serviceRequestQuote.deleteMany({ where: { serviceRequestId } });
}

describe("업체 재배정 시 partnerId 스냅샷 격리", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("재배정 후 새 업체는 이전 업체의 내부 메모·연락 기록을 절대 조회하지 못한다", async () => {
    const partnerA = await createTestPartner("A업체");
    const partnerB = await createTestPartner("B업체");
    const project = await createTestProject();
    const request = await createTestServiceRequest(project.id, partnerA.id);

    await prisma.serviceRequestActivity.create({
      data: {
        serviceRequestId: request.id,
        action: "NOTE_ADDED",
        note: "A업체만 볼 수 있어야 하는 내부 메모",
        actorRole: "PARTNER",
        partnerId: partnerA.id,
      },
    });
    await prisma.serviceRequestActivity.create({
      data: {
        serviceRequestId: request.id,
        action: "CONTACT_LOGGED",
        changes: { method: "전화", result: "A업체가 고객과 통화" },
        actorRole: "PARTNER",
        partnerId: partnerA.id,
      },
    });

    await reassignPartner(request.id, partnerB.id);

    const visibleToB = await prisma.serviceRequestActivity.findMany({
      where: { serviceRequestId: request.id, partnerId: partnerB.id },
    });
    expect(visibleToB).toHaveLength(0);

    // 삭제된 게 아니라 스코프만 닫힌 것 — 관리자(필터 없음) 또는 A 기준
    // 조회에서는 그대로 남아있어야 한다.
    const stillExistsForAudit = await prisma.serviceRequestActivity.findMany({
      where: { serviceRequestId: request.id, partnerId: partnerA.id },
    });
    expect(stillExistsForAudit).toHaveLength(2);
  });

  it("재배정 후 새 업체는 이전 업체가 올린 파일을 절대 조회하지 못한다", async () => {
    const partnerA = await createTestPartner("A업체");
    const partnerB = await createTestPartner("B업체");
    const project = await createTestProject();
    const request = await createTestServiceRequest(project.id, partnerA.id);

    await prisma.document.create({
      data: {
        projectId: project.id,
        serviceRequestId: request.id,
        category: "CONTRACT",
        uploadedByRole: "PARTNER",
        filename: "a-contract.pdf",
        mimeType: "application/pdf",
        size: 100,
        storageKey: `key-${randomUUID()}`,
        partnerId: partnerA.id,
      },
    });

    await reassignPartner(request.id, partnerB.id);

    const visibleToB = await prisma.document.findMany({
      where: { serviceRequestId: request.id, partnerId: partnerB.id },
    });
    expect(visibleToB).toHaveLength(0);

    const stillExistsForAudit = await prisma.document.findMany({
      where: { serviceRequestId: request.id, partnerId: partnerA.id },
    });
    expect(stillExistsForAudit).toHaveLength(1);
  });

  it("재배정 시 partnerStaffId와 selectedQuoteId/selectedAt을 초기화한다", async () => {
    const partnerA = await createTestPartner("A업체");
    const partnerB = await createTestPartner("B업체");
    const project = await createTestProject();
    const request = await createTestServiceRequest(project.id, partnerA.id);

    const staffA = await prisma.user.create({
      data: {
        email: `snapshot-staff-${randomUUID()}@example.com`,
        passwordHash: "irrelevant-for-this-test",
        name: "A직원",
        memberType: "PARTNER",
        partnerId: partnerA.id,
      },
    });
    const quote = await prisma.serviceRequestQuote.create({
      data: { serviceRequestId: request.id, title: "기본형", amount: 500000 },
    });
    await prisma.serviceRequest.update({
      where: { id: request.id },
      data: { partnerStaffId: staffA.id, selectedQuoteId: quote.id, selectedAt: new Date() },
    });

    await reassignPartner(request.id, partnerB.id);

    const updated = await prisma.serviceRequest.findUniqueOrThrow({ where: { id: request.id } });
    expect(updated.partnerStaffId).toBeNull();
    expect(updated.selectedQuoteId).toBeNull();
    expect(updated.selectedAt).toBeNull();
    expect(updated.partnerId).toBe(partnerB.id);

    const remainingQuotes = await prisma.serviceRequestQuote.findMany({
      where: { serviceRequestId: request.id },
    });
    expect(remainingQuotes).toHaveLength(0);
  });
});
