import { test, expect } from "./test-base";
import type { Page } from "./test-base";
import { PrismaClient } from "@prisma/client";
import {
  login,
  loginViaSession,
  createProject,
  expectNoHorizontalOverflow,
  expectControlsWithinViewport,
} from "./helpers";
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

/** property-explorer.spec.ts와 같은 이유(계정 격리)로 이 파일도 매번 새 고객 계정을 쓴다. */
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

async function saveDirectCandidate(page: Page, title: string, address: string, transactionType?: string) {
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill(address);
  if (transactionType) {
    await page.getByLabel("거래 유형", { exact: false }).selectOption(transactionType);
  }
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
}

async function shareFromAdmin(
  page: Page,
  projectId: string,
  title: string,
  address: string,
  transactionType?: string,
) {
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill(address);
  if (transactionType) {
    await page.getByLabel("거래 유형", { exact: false }).selectOption(transactionType);
  }
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(`/api/admin/projects/${projectId}/property-suggestions`) && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "고객에게 공유하기" }).click(),
  ]);
}

test("관리자 공유 매물을 저장하면 탐색 화면에 카드가 하나만 남고 '관리자 공유에서 저장함' 배지로 바뀐다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("dedup");
  const projectName = `E2E중복제거-${Date.now()}`;
  const sharedTitle = `E2E공유후저장-${Date.now()}`;

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await shareFromAdmin(page, projectId, sharedTitle, "서울특별시 마포구 상암동 1");

  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto("/my/candidate-properties");

  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  const sharedItem = explorerList.locator("div[role='listitem']").filter({ hasText: sharedTitle });
  await expect(sharedItem).toHaveCount(1);
  await expect(sharedItem.getByText(`관리자 공유 · ${projectName}`)).toBeVisible();

  // 고객이 "내 매물 후보에 저장"을 완료한다.
  await sharedItem.getByRole("link", { name: "내 매물 후보에 저장" }).click();
  await page.waitForURL((url) => url.pathname === "/my/candidate-properties/new");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.goto("/my/candidate-properties");
  const explorerListAfter = page.getByRole("list", { name: "매물 후보 목록" });
  const cardsWithTitle = explorerListAfter.locator("div[role='listitem']").filter({ hasText: sharedTitle });
  // 저장 전에는 SUGGESTED 카드 하나였고, 저장 후에는 SAVED 카드 하나로
  // 바뀔 뿐 두 장이 동시에 보이면 안 된다(중복 표시 버그의 핵심 시나리오).
  await expect(cardsWithTitle).toHaveCount(1);
  await expect(cardsWithTitle.getByText(`관리자 공유에서 저장함 · ${projectName}`)).toBeVisible();
});

test("이름·주소로 검색하면 일치하는 매물만 남고, 검색어를 지우면 전체 목록으로 돌아온다", async ({ page }) => {
  const customer = await createIsolatedCustomer("search");
  await loginViaSession(page, customer.email);
  const matchTitle = `역삼검색매칭-${Date.now()}`;
  const otherTitle = `무관한매물-${Date.now()}`;

  await saveDirectCandidate(page, matchTitle, "서울특별시 강남구 역삼동 1");
  await saveDirectCandidate(page, otherTitle, "서울특별시 마포구 합정동 1");

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await expect(explorerList.getByText(matchTitle)).toBeVisible();
  await expect(explorerList.getByText(otherTitle)).toBeVisible();

  const searchInput = page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색");
  await searchInput.fill("역삼검색매칭");
  await expect(explorerList.getByText(matchTitle)).toBeVisible();
  await expect(explorerList.getByText(otherTitle)).toHaveCount(0);

  await searchInput.fill("");
  await expect(explorerList.getByText(matchTitle)).toBeVisible();
  await expect(explorerList.getByText(otherTitle)).toBeVisible();
});

test("출처 필터 '관리자 공유'는 아직 저장 전인 공유 매물과 공유에서 저장한 매물을 모두 포함하고, 직접 저장한 매물은 뺀다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("filter-source");
  const projectName = `E2E출처필터-${Date.now()}`;
  const directTitle = `E2E직접저장필터-${Date.now()}`;
  const sharedTitle = `E2E공유전용필터-${Date.now()}`;

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);
  await saveDirectCandidate(page, directTitle, "서울특별시 강남구 역삼동 2");

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await shareFromAdmin(page, projectId, sharedTitle, "서울특별시 마포구 상암동 2");

  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto("/my/candidate-properties");

  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await expect(explorerList.getByText(directTitle)).toBeVisible();
  await expect(explorerList.getByText(sharedTitle)).toBeVisible();

  await page.getByLabel("출처", { exact: false }).selectOption("ADMIN_SHARED");
  await expect(explorerList.getByText(sharedTitle)).toBeVisible();
  await expect(explorerList.getByText(directTitle)).toHaveCount(0);

  await page.getByLabel("출처", { exact: false }).selectOption("DIRECT");
  await expect(explorerList.getByText(directTitle)).toBeVisible();
  await expect(explorerList.getByText(sharedTitle)).toHaveCount(0);
});

test("거래 유형 필터를 적용하면 다른 거래 유형의 매물이 숨겨진다", async ({ page }) => {
  const customer = await createIsolatedCustomer("filter-transaction");
  await loginViaSession(page, customer.email);
  const jeonseTitle = `E2E전세매물-${Date.now()}`;
  const maemaeTitle = `E2E매매매물-${Date.now()}`;

  await saveDirectCandidate(page, jeonseTitle, "서울특별시 강남구 역삼동 3", "전세");
  await saveDirectCandidate(page, maemaeTitle, "서울특별시 강남구 역삼동 4", "매매");

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await page.getByRole("combobox", { name: "거래 유형" }).selectOption("전세");
  await expect(explorerList.getByText(jeonseTitle)).toBeVisible();
  await expect(explorerList.getByText(maemaeTitle)).toHaveCount(0);
});

test("검색·필터 조합 결과가 0건이면 안내 문구와 초기화 버튼이 보이고, 초기화하면 전체 목록으로 돌아온다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("filter-empty");
  await loginViaSession(page, customer.email);
  const title = `E2E필터초기화-${Date.now()}`;
  await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 5", "전세");

  await page.goto("/my/candidate-properties");
  const searchInput = page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색");
  await searchInput.fill("존재하지않는매물이름검색어");

  await expect(page.getByText("조건에 맞는 매물이 없습니다.")).toBeVisible();
  // 검색·필터 툴바에도 같은 이름의 초기화 버튼이 있으므로(필터가 활성 상태라 이미 보인다),
  // 결과 없음 안내 카드 안의 버튼을 명시적으로 고른다.
  await page.getByText("조건에 맞는 매물이 없습니다.").locator("..").getByRole("button", { name: "필터 초기화" }).click();

  await expect(searchInput).toHaveValue("");
  await expect(page.getByRole("list", { name: "매물 후보 목록" }).getByText(title)).toBeVisible();
});

test("검색어를 입력한 뒤 새로고침해도 검색 상태가 URL을 통해 유지된다", async ({ page }) => {
  const customer = await createIsolatedCustomer("url-sync");
  await loginViaSession(page, customer.email);
  const title = `E2EURL상태유지-${Date.now()}`;
  await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 6");

  await page.goto("/my/candidate-properties");
  const searchInput = page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색");
  await searchInput.fill("URL상태유지");

  await expect(page).toHaveURL(/[?&]q=/);
  await page.reload();
  await expect(page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색")).toHaveValue(/URL상태유지/);
  await expect(page.getByRole("list", { name: "매물 후보 목록" }).getByText(title)).toBeVisible();
});

test("프로젝트명으로 관리자 공유 매물을 검색할 수 있다", async ({ page }) => {
  const customer = await createIsolatedCustomer("search-project");
  const projectName = `E2E프로젝트명검색-${Date.now()}`;
  const sharedTitle = `E2E공유매물검색용-${Date.now()}`;
  const otherTitle = `E2E무관공유매물-${Date.now()}`;

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);
  await saveDirectCandidate(page, otherTitle, "서울특별시 마포구 합정동 2");

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await shareFromAdmin(page, projectId, sharedTitle, "서울특별시 마포구 상암동 3");

  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto("/my/candidate-properties");

  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await expect(explorerList.getByText(sharedTitle)).toBeVisible();
  await expect(explorerList.getByText(otherTitle)).toBeVisible();

  await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill(projectName);
  await expect(explorerList.getByText(sharedTitle)).toBeVisible();
  await expect(explorerList.getByText(otherTitle)).toHaveCount(0);
});

test("진행 상태 필터를 적용하면 다른 상태의 매물이 숨겨진다", async ({ page }) => {
  const customer = await createIsolatedCustomer("filter-status");
  await loginViaSession(page, customer.email);
  const interestTitle = `E2E관심상태-${Date.now()}`;
  const finalTitle = `E2E최종후보상태-${Date.now()}`;

  await saveDirectCandidate(page, interestTitle, "서울특별시 강남구 역삼동 8");
  await saveDirectCandidate(page, finalTitle, "서울특별시 강남구 역삼동 9");

  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    await prisma.candidateProperty.updateMany({ where: { title: finalTitle }, data: { status: "최종 후보" } });
  } finally {
    await prisma.$disconnect();
  }

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await page.getByRole("combobox", { name: "진행 상태" }).selectOption("FINAL");
  await expect(explorerList.getByText(finalTitle)).toBeVisible();
  await expect(explorerList.getByText(interestTitle)).toHaveCount(0);
});

test("거래 유형 '미입력' 필터는 거래 유형을 고르지 않은 매물만 보여준다", async ({ page }) => {
  const customer = await createIsolatedCustomer("filter-unspecified");
  await loginViaSession(page, customer.email);
  const unspecifiedTitle = `E2E거래유형미입력-${Date.now()}`;
  const jeonseTitle = `E2E거래유형전세-${Date.now()}`;

  await saveDirectCandidate(page, unspecifiedTitle, "서울특별시 강남구 역삼동 10");
  await saveDirectCandidate(page, jeonseTitle, "서울특별시 강남구 역삼동 11", "전세");

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await page.getByRole("combobox", { name: "거래 유형" }).selectOption("UNSPECIFIED");
  await expect(explorerList.getByText(unspecifiedTitle)).toBeVisible();
  await expect(explorerList.getByText(jeonseTitle)).toHaveCount(0);

  // URL에도 미입력 필터 값이 그대로 반영된다(허용값 화이트리스트 포함 확인).
  await expect(page).toHaveURL(/[?&]transaction=UNSPECIFIED/);
  await page.reload();
  await expect(explorerList.getByText(unspecifiedTitle)).toBeVisible();
  await expect(explorerList.getByText(jeonseTitle)).toHaveCount(0);
});

test("출처 필터 '관리자 공유'는 아직 저장하지 않은 공유 매물과 공유에서 저장한 매물을 동시에 보여준다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("filter-source-both");
  const projectName = `E2E출처동시표시-${Date.now()}`;
  const unsavedSharedTitle = `E2E미저장공유-${Date.now()}`;
  const savedSharedTitle = `E2E저장된공유-${Date.now()}`;

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await shareFromAdmin(page, projectId, unsavedSharedTitle, "서울특별시 마포구 상암동 4");
  await shareFromAdmin(page, projectId, savedSharedTitle, "서울특별시 마포구 상암동 5");

  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  let suggestionId: string;
  try {
    const suggestion = await prisma.projectPropertySuggestion.findFirstOrThrow({
      where: { projectId, title: savedSharedTitle },
    });
    suggestionId = suggestion.id;
  } finally {
    await prisma.$disconnect();
  }

  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto(`/my/candidate-properties/new?fromSuggestion=${suggestionId}`);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await page.getByLabel("출처", { exact: false }).selectOption("ADMIN_SHARED");
  // 저장 전(SUGGESTED)과 저장 후(SAVED, origin=ADMIN_SHARED) 둘 다 이 필터에 포함된다.
  await expect(explorerList.getByText(unsavedSharedTitle)).toBeVisible();
  await expect(explorerList.getByText(savedSharedTitle)).toBeVisible();
  await expect(explorerList.getByText(`관리자 공유 · ${projectName}`)).toBeVisible();
  await expect(explorerList.getByText(`관리자 공유에서 저장함 · ${projectName}`)).toBeVisible();
});

test("검색어·출처·거래 유형·진행 상태 필터를 동시에 적용하면 모두 만족하는 매물만 남는다(AND 조합)", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("filter-and");
  await loginViaSession(page, customer.email);
  const matchTitle = `E2EAND조합일치-${Date.now()}`;
  const wrongTransactionTitle = `E2EAND조합거래유형불일치-${Date.now()}`;
  const wrongNameTitle = `E2E전혀다른이름-${Date.now()}`;

  await saveDirectCandidate(page, matchTitle, "서울특별시 강남구 역삼동 12", "전세");
  await saveDirectCandidate(page, wrongTransactionTitle, "서울특별시 강남구 역삼동 13", "매매");
  await saveDirectCandidate(page, wrongNameTitle, "서울특별시 강남구 역삼동 14", "전세");

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });

  await page.getByLabel("출처", { exact: false }).selectOption("DIRECT");
  await page.getByRole("combobox", { name: "거래 유형" }).selectOption("전세");
  await page.getByRole("combobox", { name: "진행 상태" }).selectOption("INTEREST");
  await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill("AND조합일치");

  await expect(explorerList.getByText(matchTitle)).toBeVisible();
  await expect(explorerList.getByText(wrongTransactionTitle)).toHaveCount(0);
  await expect(explorerList.getByText(wrongNameTitle)).toHaveCount(0);
});

test("필터를 적용한 채 상세 페이지로 이동했다가 브라우저 뒤로가기를 하면 검색어·필터·결과가 복원된다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("back-restore");
  await loginViaSession(page, customer.email);
  const matchTitle = `E2E뒤로가기복원-${Date.now()}`;
  const otherTitle = `E2E뒤로가기제외-${Date.now()}`;

  await saveDirectCandidate(page, matchTitle, "서울특별시 강남구 역삼동 15", "전세");
  await saveDirectCandidate(page, otherTitle, "서울특별시 강남구 역삼동 16", "매매");

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill("뒤로가기복원");
  await page.getByRole("combobox", { name: "거래 유형" }).selectOption("전세");
  await expect(explorerList.getByText(matchTitle)).toBeVisible();
  await expect(explorerList.getByText(otherTitle)).toHaveCount(0);

  await explorerList.getByRole("link", { name: "상세보기 →" }).first().click();
  await expect(page).toHaveURL(/\/my\/candidate-properties\/[a-z0-9]+$/);

  await page.goBack();
  await expect(page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색")).toHaveValue(/뒤로가기복원/);
  await expect(page.getByRole("combobox", { name: "거래 유형" })).toHaveValue("전세");
  const restoredList = page.getByRole("list", { name: "매물 후보 목록" });
  await expect(restoredList.getByText(matchTitle)).toBeVisible();
  await expect(restoredList.getByText(otherTitle)).toHaveCount(0);
});

test("필터를 적용한 뒤에도 모바일 목록 선택이 지도 보기와 동기화된다", async ({ page }) => {
  const customer = await createIsolatedCustomer("filter-mobile-sync");
  await page.setViewportSize({ width: 390, height: 844 });
  await loginViaSession(page, customer.email);
  const matchTitle = `E2E모바일필터동기화-${Date.now()}`;
  const otherTitle = `E2E모바일필터제외-${Date.now()}`;

  await saveDirectCandidate(page, matchTitle, "서울특별시 강남구 역삼동 17", "전세");
  await saveDirectCandidate(page, otherTitle, "서울특별시 강남구 역삼동 18", "매매");

  await page.goto("/my/candidate-properties");
  // 390px에서는 지도가 첫 화면에 들어오도록 필터 select 3종이 기본으로
  // 접혀 있다 — 열어야 거래 유형을 고를 수 있다.
  await page.getByRole("button", { name: /^필터/ }).click();
  await page.getByRole("combobox", { name: "거래 유형" }).selectOption("전세");

  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  const matchItem = explorerList.locator("div[role='listitem']").filter({ hasText: matchTitle });
  await expect(matchItem).toBeVisible();
  await expect(explorerList.getByText(otherTitle)).toHaveCount(0);

  await matchItem.getByRole("button", { name: /지도에서 보기|지도에 표시 중/ }).click();
  await expect(page.getByRole("list", { name: "매물 후보 목록" })).toBeHidden();
  await expect(page.getByText(matchTitle).last()).toBeVisible();
});

test.describe("탐색 화면 검색·필터 UI — 주요 viewport에서 가로 오버플로가 없다", () => {
  test("검색창·필터 select가 320~1366px에서 넘치지 않는다", async ({ page }) => {
    const customer = await createIsolatedCustomer("filter-responsive");
    await loginViaSession(page, customer.email);
    await saveDirectCandidate(page, `E2E반응형검색필터-${Date.now()}`, "서울특별시 강남구 역삼동 7");

    await page.goto("/my/candidate-properties");
    await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill("검색 UI 반응형 확인용 매우 긴 검색어 테스트");
    await checkWidths(page, [320, 390, 768, 1024, 1366]);
  });

  test("320px에서 검색창·필터 select·초기화 버튼의 bounding box가 뷰포트를 벗어나지 않는다", async ({ page }) => {
    const customer = await createIsolatedCustomer("filter-320-bbox");
    await loginViaSession(page, customer.email);
    await saveDirectCandidate(page, `E2E320바운딩박스-${Date.now()}`, "서울특별시 강남구 역삼동 19");

    await page.setViewportSize({ width: 320, height: 900 });
    await page.goto("/my/candidate-properties");
    await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill("바운딩박스 확인용 검색어");
    await expectControlsWithinViewport(page);
    await expectNoHorizontalOverflow(page, "매물 탐색 검색·필터(320px)");
  });

  test("검색 input·필터 select 3종의 실제 폰트 크기가 320~1366px, 모바일 가로 폭(667·740·844px)에서도 16px 이상이다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("filter-input-fontsize");
    await loginViaSession(page, customer.email);
    await saveDirectCandidate(page, `E2E입력폰트크기-${Date.now()}`, "서울특별시 강남구 역삼동 22");

    await page.goto("/my/candidate-properties");

    const controls = [
      page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색"),
      page.getByRole("combobox", { name: "출처" }),
      page.getByRole("combobox", { name: "거래 유형" }),
      page.getByRole("combobox", { name: "진행 상태" }),
    ];

    // iOS Safari는 포커스되는 입력 컨트롤의 실제 렌더링 font-size가 16px
    // 미만이면 화면을 자동으로 확대해버린다 — sm:text-sm처럼 넓은 화면에서만
    // 줄이는 규칙이 남아 있으면 가로로 넓은 모바일(가로 모드)에서도 여전히
    // iOS 입력 컨트롤이라 이 문제가 재현된다. 320~1366px 데스크톱 구간과
    // 667·740·844px(모바일 가로 폭) 양쪽에서 실제 계산된 폰트 크기를 확인한다.
    for (const width of [320, 375, 390, 667, 740, 768, 844, 1024, 1366]) {
      await page.setViewportSize({ width, height: 400 });
      // lg(1024px) 미만에서는 필터 select 3종이 기본으로 접혀 있다 — 실제
      // 렌더링된 font-size를 재려면 먼저 펼쳐야 한다(닫힌 상태는
      // display:none이라 getComputedStyle이 의미 없는 값을 준다).
      if (width < 1024) {
        const filterToggle = page.getByRole("button", { name: /^필터/ });
        if ((await filterToggle.getAttribute("aria-expanded")) === "false") {
          await filterToggle.click();
        }
      }
      for (const control of controls) {
        const fontSize = await control.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(fontSize, `${width}px에서 입력 컨트롤 font-size가 16px 미만(${fontSize}px)`).toBeGreaterThanOrEqual(16);
      }
    }
  });

  test("[CSS zoom 근사] 200% 확대에서도 검색·필터·초기화 버튼을 계속 쓸 수 있고 가로 오버플로가 없다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("filter-zoom");
    await loginViaSession(page, customer.email);
    await saveDirectCandidate(page, `E2E200퍼센트확대-${Date.now()}`, "서울특별시 강남구 역삼동 20");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/my/candidate-properties");
    // 검색 결과가 실제로 있는 채로(검색·필터 컨트롤은 남아 있지만 "결과
    // 없음" 안내 카드의 두 번째 "필터 초기화" 버튼은 뜨지 않는 상태) 확대
    // 테스트를 해야 한다 — 결과 0건이면 안내 카드에도 같은 이름의 버튼이
    // 하나 더 생겨 아래 getByRole 단일 매치 가정이 깨진다.
    await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill("200퍼센트확대");

    // Chromium의 비표준 zoom CSS 속성으로 레이아웃을 2배로 재계산시킨다.
    // 실제 브라우저·OS의 "텍스트만 확대"나 실기기 접근성 확대와는 다른
    // 메커니즘이다 — 페이지 전체가 배율만큼 커지는 CSS 근사 검사일 뿐,
    // "실제 200% 텍스트 확대 완료 검증"이 아니다. 실제 동작 확인은 실기기
    // 확인 대상이다.
    await page.evaluate(() => {
      document.documentElement.style.zoom = "2";
    });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `zoom:2 시 가로 오버플로 발생 (scrollWidth - clientWidth = ${overflow})`).toBeLessThanOrEqual(2);

    await expect(page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "출처" })).toBeVisible();
    const resetButton = page.getByRole("button", { name: "필터 초기화" });
    await expect(resetButton).toBeVisible();
    await resetButton.click();
    await expect(page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색")).toHaveValue("");
  });

  test("[font-size 200% 근사] 텍스트 확대 상태에서도 검색·필터·초기화 버튼을 쓸 수 있고 핵심 문구가 잘리지 않는다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("filter-font-zoom");
    await loginViaSession(page, customer.email);
    await saveDirectCandidate(page, `E2E폰트크기확대-${Date.now()}`, "서울특별시 강남구 역삼동 21");

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/my/candidate-properties");
    await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill("폰트크기확대");

    // 뷰포트 zoom과 다른 방식의 근사 검사다 — 루트 font-size를 200%로
    // 올려 rem 기반 크기(이 프로젝트의 Tailwind 유틸리티는 모두 rem 단위)를
    // 함께 키운다. 브라우저의 "텍스트 크기만 키우기(text-only zoom)"·OS
    // 손쉬운 사용 확대와도 메커니즘이 다르므로, 이 역시 실제 iPhone
    // Safari·OS 글자 확대의 대체 증거가 아니라 근사 검사일 뿐이다.
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `font-size 200% 시 가로 오버플로 발생 (scrollWidth - clientWidth = ${overflow})`).toBeLessThanOrEqual(2);

    const searchInput = page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색");
    await expect(searchInput).toBeVisible();
    await expect(page.getByRole("combobox", { name: "출처" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "거래 유형" })).toBeVisible();
    await expect(page.getByRole("combobox", { name: "진행 상태" })).toBeVisible();

    const resetButton = page.getByRole("button", { name: "필터 초기화" });
    await expect(resetButton).toBeVisible();
    // 핵심 문구("필터 초기화")가 버튼 안에서 잘리지 않는지(내부 스크롤이
    // 생기지 않는지) 요소 단위로 확인한다 — 페이지 전체 오버플로 검사만으로는
    // 개별 버튼 안에서 텍스트가 잘리는 경우를 못 잡는다.
    const resetButtonOverflow = await resetButton.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(resetButtonOverflow, "필터 초기화 버튼 안에서 문구가 잘림").toBeLessThanOrEqual(1);

    await resetButton.click();
    await expect(searchInput).toHaveValue("");
  });
});
