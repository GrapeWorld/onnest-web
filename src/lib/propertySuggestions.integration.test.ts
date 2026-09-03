import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { listAllCustomerPropertySuggestions } from "@/lib/propertySuggestions";

/**
 * 실제(테스트 전용) DB를 쓴다 — customerPropertySuggestionSelect가 실제로
 * userId/프로젝트 소유권으로 좁혀지는지, adminMemo·공유자 정보가 응답에
 * 섞이지 않는지, 새로 추가한 latitude/longitude가 본인 데이터에만 보이고
 * 다른 고객에게는 전혀 조회되지 않는지는 mock으로는 의미 있게 검증할 수
 * 없다(where 절 자체가 맞는지를 확인해야 한다).
 */

async function createTestUser(prefix: string) {
  return prisma.user.create({
    data: { email: `${prefix}-${randomUUID()}@example.com`, name: prefix },
  });
}

describe("listAllCustomerPropertySuggestions (integration — 좌표 필드와 고객 격리)", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("본인 프로젝트에 공유된 매물의 좌표를 정상적으로 돌려준다", async () => {
    const customer = await createTestUser("suggestion-coords-owner");
    const admin = await createTestUser("suggestion-coords-admin");
    const project = await prisma.project.create({
      data: { userId: customer.id, name: "좌표 테스트 프로젝트", spaceType: "아파트" },
    });
    await prisma.projectPropertySuggestion.create({
      data: {
        projectId: project.id,
        sourceUrl: "https://fin.land.naver.com/complexes/1",
        title: "좌표 있는 공유 매물",
        address: "경상남도 거제시",
        latitude: 34.88,
        longitude: 128.62,
        adminMemo: "절대 노출되면 안 되는 내부 메모",
        sharedById: admin.id,
        sharedByName: admin.name ?? "관리자",
        sharedByEmail: admin.email,
      },
    });

    const { items } = await listAllCustomerPropertySuggestions(customer.id);

    expect(items).toHaveLength(1);
    expect(items[0].latitude).toBe(34.88);
    expect(items[0].longitude).toBe(128.62);
    // adminMemo·공유자 정보는 customerPropertySuggestionSelect에 없어 응답 타입 자체에 존재하지 않는다.
    expect(items[0]).not.toHaveProperty("adminMemo");
    expect(items[0]).not.toHaveProperty("sharedById");
  });

  it("다른 고객에게 공유된 매물의 좌표는 전혀 조회되지 않는다(격리)", async () => {
    const owner = await createTestUser("suggestion-isolation-owner");
    const stranger = await createTestUser("suggestion-isolation-stranger");
    const admin = await createTestUser("suggestion-isolation-admin");
    const project = await prisma.project.create({
      data: { userId: owner.id, name: "격리 테스트 프로젝트", spaceType: "아파트" },
    });
    await prisma.projectPropertySuggestion.create({
      data: {
        projectId: project.id,
        sourceUrl: "https://fin.land.naver.com/complexes/2",
        title: "다른 고객 소유 매물",
        latitude: 37.5,
        longitude: 127.0,
        sharedById: admin.id,
        sharedByName: admin.name ?? "관리자",
        sharedByEmail: admin.email,
      },
    });

    const { items: strangerItems } = await listAllCustomerPropertySuggestions(stranger.id);
    const { items: ownerItems } = await listAllCustomerPropertySuggestions(owner.id);

    expect(strangerItems).toHaveLength(0);
    expect(ownerItems).toHaveLength(1);
  });

  it("좌표가 없는 공유 매물은 latitude/longitude가 null로 내려온다(항상 부가 정보)", async () => {
    const customer = await createTestUser("suggestion-no-coords");
    const admin = await createTestUser("suggestion-no-coords-admin");
    const project = await prisma.project.create({
      data: { userId: customer.id, name: "좌표 없음 프로젝트", spaceType: "아파트" },
    });
    await prisma.projectPropertySuggestion.create({
      data: {
        projectId: project.id,
        sourceUrl: "https://fin.land.naver.com/complexes/3",
        title: "좌표 없는 공유 매물",
        sharedById: admin.id,
        sharedByName: admin.name ?? "관리자",
        sharedByEmail: admin.email,
      },
    });

    const { items } = await listAllCustomerPropertySuggestions(customer.id);

    expect(items).toHaveLength(1);
    expect(items[0].latitude).toBeNull();
    expect(items[0].longitude).toBeNull();
  });
});
