import { test, expect } from "./test-base";
import type { Page } from "./test-base";
import { PrismaClient } from "@prisma/client";
import { login, loginViaSession, createProject } from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN } from "./fixtures";

function uniqueNaverListingUrl() {
  return `https://fin.land.naver.com/complexes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function switchUser(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await login(page, email, password);
}

/**
 * 이 파일의 테스트 전용 고객 계정을 매번 새로 만든다. E2E_CUSTOMER를
 * 공유하면 (a) 다른 스펙 파일의 "새로 공유된 매물 1건"처럼 누적 개수에
 * 기대는 깨지기 쉬운 검증을 깨뜨리고, (b) 순차 스위트 전체를 도는 동안
 * 쌓인 매물 수십 건이 같이 렌더링돼 느려진다 — 매번 빈 계정에서
 * 시작하면 두 문제 모두 피할 수 있다("다른 고객" 격리 테스트가 이미
 * 쓰는 패턴과 같다).
 */
async function createIsolatedCustomer(prefix: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    const email = `e2e.${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@onnesthome.com`;
    const user = await prisma.user.create({ data: { email, name: prefix, termsAgreedAt: new Date() } });
    return { id: user.id, email };
  } finally {
    await prisma.$disconnect();
  }
}

test("매물 후보 탐색 화면에 직접 저장한 매물과 관리자 공유 매물이 출처 구분과 함께 같이 표시되고, 목록 선택이 지도 패널과 동기화된다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("explorer-combined");
  const projectName = `E2E탐색화면-${Date.now()}`;
  const savedTitle = `E2E직접저장-${Date.now()}`;
  const sharedTitle = `E2E관리자공유-${Date.now()}`;

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);

  // 고객이 직접 매물을 저장한다.
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(savedTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 역삼동 1");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  // 관리자가 그 프로젝트에 매물을 공유한다.
  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(sharedTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 마포구 상암동 1");
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  // 클릭 직후 확인 다이얼로그에 매물명이 잠깐 남아 있어(handleConfirm이
  // 끝나기 전) getByText(sharedTitle)이 그 문구를 조기에 잡아버릴 수
  // 있다 — 실제 저장이 끝났는지는 POST 응답을 직접 기다려야 확실하다.
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(`/api/admin/projects/${projectId}/property-suggestions`) && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "고객에게 공유하기" }).click(),
  ]);

  // 고객이 탐색 화면에서 둘을 함께 본다.
  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto("/my/candidate-properties");

  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  const savedItem = explorerList.locator("div[role='listitem']").filter({ hasText: savedTitle });
  const sharedItem = explorerList.locator("div[role='listitem']").filter({ hasText: sharedTitle });

  await expect(savedItem).toBeVisible();
  await expect(sharedItem).toBeVisible();
  await expect(savedItem.getByText("내가 저장함")).toBeVisible();
  await expect(sharedItem.getByText(`관리자 공유 · ${projectName}`)).toBeVisible();

  // 지도 SDK가 미설정인 E2E 환경에서도 화면은 정상 동작하고, 선택한 항목에
  // 맞는 안내로 지도 패널이 동기화된다 — 아직 저장 전인 공유 매물은 정지
  // 지도 프록시가 없어 주소 텍스트로 대체된다(MapFallback).
  await sharedItem.getByRole("button", { name: /지도에서 보기|지도에 표시 중/ }).click();
  await expect(page.getByText("서울특별시 마포구 상암동 1").last()).toBeVisible();
  await expect(page.getByText(sharedTitle).last()).toBeVisible();

  await savedItem.getByRole("button", { name: /지도에서 보기|지도에 표시 중/ }).click();
  await expect(page.getByText(savedTitle).last()).toBeVisible();
});

test("좌표 없는 매물도 목록·주소는 정상 표시된다", async ({ page }) => {
  const customer = await createIsolatedCustomer("explorer-nocoords");
  await loginViaSession(page, customer.email);
  const title = `E2E좌표없음-${Date.now()}`;

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  // 주소를 비워둔다 — 지도 API가 설정돼 있어도 좌표를 캐시할 대상이 없다.
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await expect(explorerList.getByText(title)).toBeVisible();
  await expect(explorerList.getByText("주소 미입력")).toBeVisible();
});

test("모바일 화면에서는 목록 보기·지도 보기 버튼으로 전환된다", async ({ page }) => {
  const customer = await createIsolatedCustomer("explorer-mobile");
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaSession(page, customer.email);
  const title = `E2E모바일전환-${Date.now()}`;

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.goto("/my/candidate-properties");
  const listTab = page.getByRole("button", { name: "목록 보기" });
  const mapTab = page.getByRole("button", { name: "지도 보기" });
  await expect(listTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "매물 후보 목록" })).toBeVisible();

  await mapTab.click();
  await expect(mapTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "매물 후보 목록" })).toBeHidden();
  await expect(page.getByRole("button", { name: "← 목록으로" })).toBeVisible();

  await page.getByRole("button", { name: "← 목록으로" }).click();
  await expect(listTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "매물 후보 목록" })).toBeVisible();
});

test("다른 고객의 매물과 공유받지 않은 매물은 탐색 화면에 나타나지 않는다", async ({ page }) => {
  const viewer = await createIsolatedCustomer("explorer-isolation-viewer");
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const otherTitle = `E2E다른고객매물-${Date.now()}`;

  try {
    const other = await prisma.user.create({
      data: { email: `e2e.explorer-isolation-other-${Date.now()}@onnesthome.com`, name: "다른 고객" },
    });
    await prisma.candidateProperty.create({
      data: { userId: other.id, sourceUrl: uniqueNaverListingUrl(), title: otherTitle },
    });
  } finally {
    await prisma.$disconnect();
  }

  await loginViaSession(page, viewer.email);
  await page.goto("/my/candidate-properties");
  await expect(page.getByText(otherTitle)).toHaveCount(0);
});

test.describe("매물 후보 탐색 화면 — 주요 viewport에서 가로 오버플로가 없다", () => {
  test("목록+지도 화면이 320~1366px에서 넘치지 않는다", async ({ page }) => {
    const customer = await createIsolatedCustomer("explorer-responsive");
    await loginViaSession(page, customer.email);
    const title = "매우매우매우매우매우매우매우매우매우매우긴매물이름테스트탐색화면용".repeat(2).slice(0, 90);
    const address = "서울특별시매우매우매우매우매우매우매우매우매우매우매우매우긴주소테스트탐색화면용".repeat(2).slice(0, 150);

    await page.goto("/my/candidate-properties/new");
    await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
    await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
    await page.getByRole("textbox", { name: "주소", exact: false }).fill(address);
    await page.getByRole("button", { name: "매물 후보 저장" }).click();
    await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

    await page.goto("/my/candidate-properties");
    await checkWidths(page, [320, 390, 768, 1024, 1366]);
  });

  test("긴 관리자 공유 매물명·프로젝트명·주소·공유 이유·확인 필요 문구에서도 320~1366px에서 넘치지 않는다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("explorer-shared-long");
    const longProjectName = "매우".repeat(50); // 100자
    const longSuggestionTitle = "관리자공유매물명테스트".repeat(10).slice(0, 100); // 100자
    const longAddress = "서울특별시매우매우매우매우매우매우매우매우매우매우매우매우긴주소테스트공유화면용".repeat(2).slice(0, 150); // 150자
    const longSharedReason = "이 매물을 공유하는 이유가 아주 길게 이어지는 경우를 확인합니다. ".repeat(6);
    const longCautionNote = "계약 전 별도로 확인이 필요한 사항이 아주 길게 이어지는 경우를 확인합니다. ".repeat(6);

    await loginViaSession(page, customer.email);
    const projectId = await createProject(page, longProjectName);

    await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto(`/admin/projects/${projectId}`);
    await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
    await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(longSuggestionTitle);
    await page.getByRole("textbox", { name: "주소", exact: false }).fill(longAddress);
    await page.getByRole("textbox", { name: "고객에게 공유할 이유" }).fill(longSharedReason);
    await page.getByRole("textbox", { name: "고객이 추가로 확인해야 할 점", exact: false }).fill(longCautionNote);
    await page.getByRole("button", { name: "공유 내용 확인" }).click();
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/admin/projects/${projectId}/property-suggestions`) && res.request().method() === "POST",
      ),
      page.getByRole("button", { name: "고객에게 공유하기" }).click(),
    ]);

    await page.context().clearCookies();
    await loginViaSession(page, customer.email);
    await page.goto("/my/candidate-properties");

    const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
    await expect(explorerList.getByText(longSuggestionTitle)).toBeVisible();
    await expect(explorerList.getByText(`관리자 공유 · ${longProjectName}`)).toBeVisible();

    await checkWidths(page, [320, 390, 768, 1024, 1366]);

    // 모바일에서 목록·지도 전환도 여전히 정상 동작해야 한다.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "지도 보기" }).click();
    await expect(page.getByRole("button", { name: "← 목록으로" })).toBeVisible();
    await checkWidths(page, [320, 390]);
  });
});
