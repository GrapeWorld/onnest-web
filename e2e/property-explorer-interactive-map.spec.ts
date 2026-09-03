import { test, expect } from "./test-base";
import type { Page } from "./test-base";
import { PrismaClient } from "@prisma/client";
import { loginViaSession } from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";

/**
 * E2E 환경은 NCP_MAP_CLIENT_ID/SECRET·NEXT_PUBLIC_NCP_MAP_CLIENT_ID를 전부
 * 빈 문자열로 강제한다(playwright.config.ts) — 결정적으로 돌아야 하는
 * E2E가 외부 지도 스크립트 CDN·실제 지오코딩 API 네트워크 상태에 좌우되지
 * 않게 하기 위해서다(정지 지도 검증 때부터 있던 원칙과 같다). 그래서:
 *
 * - 인터랙티브 지도는 항상 "미설정" 폴백 상태로 렌더링된다 — 실제 SDK
 *   로딩·마커 클릭·bounds 자동 조정은 여기서 검증할 수 없다(마커 생성·
 *   bounds 계산 등 데이터 변환 로직은 src/lib/propertyExplorer.test.ts의
 *   순수 함수 단위 테스트가 담당한다). 실제 지도 렌더링·마커 클릭은
 *   NEXT_PUBLIC_NCP_MAP_CLIENT_ID를 설정하고 도메인을 등록한 뒤 실기기·
 *   로컬 브라우저로 확인해야 한다.
 * - geocodeAddress도 항상 실패하므로(NCP_MAP_CLIENT_ID 없음), UI에서
 *   주소를 입력하는 것만으로는 좌표가 생기지 않는다 — 좌표가 있는 상태를
 *   테스트하려면 Prisma로 직접 latitude/longitude를 심는다.
 */

function uniqueNaverListingUrl() {
  return `https://fin.land.naver.com/complexes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

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

async function saveDirectCandidate(page: Page, title: string, address: string) {
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill(address);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
}

/** geocodeAddress가 E2E에서 항상 실패하므로, 좌표가 있는 상태는 Prisma로 직접 만든다. */
async function seedCoordinates(title: string, lat: number, lng: number) {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    await prisma.candidateProperty.updateMany({ where: { title }, data: { latitude: lat, longitude: lng } });
  } finally {
    await prisma.$disconnect();
  }
}

test("데스크톱 첫 진입부터 지도 영역이 목록 옆에 표시되고, 목록보다 넓다(약 35~40% : 60~65%)", async ({ page }) => {
  const customer = await createIsolatedCustomer("map-desktop-first");
  await loginViaSession(page, customer.email);
  await saveDirectCandidate(page, `E2E데스크톱지도-${Date.now()}`, "서울특별시 강남구 역삼동 1");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/my/candidate-properties");

  const mapRegion = page.getByRole("region", { name: "매물 위치 지도" });
  await expect(mapRegion).toBeVisible();
  // 데스크톱에서는 "지도 보기" 버튼을 누를 필요 없이 첫 진입부터 바로 보인다.
  await expect(page.getByRole("button", { name: "지도 보기" })).toBeHidden();

  const listBox = await page.getByRole("list", { name: "매물 후보 목록" }).boundingBox();
  const mapBox = await mapRegion.boundingBox();
  expect(listBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  if (listBox && mapBox) {
    const ratio = listBox.width / (listBox.width + mapBox.width);
    expect(ratio, `목록 비율이 예상 범위(약 0.30~0.45)를 벗어남: ${ratio}`).toBeGreaterThan(0.3);
    expect(ratio).toBeLessThan(0.45);
    expect(mapBox.width).toBeGreaterThan(listBox.width);
  }
});

test("목록 카드를 선택하면 선택 매물 요약 카드가 함께 바뀐다", async ({ page }) => {
  const customer = await createIsolatedCustomer("map-summary-sync");
  await loginViaSession(page, customer.email);
  const titleA = `E2E요약카드A-${Date.now()}`;
  const titleB = `E2E요약카드B-${Date.now()}`;
  await saveDirectCandidate(page, titleA, "서울특별시 강남구 역삼동 2");
  await saveDirectCandidate(page, titleB, "서울특별시 강남구 역삼동 3");

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/my/candidate-properties");

  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  const itemA = explorerList.locator("div[role='listitem']").filter({ hasText: titleA });
  const itemB = explorerList.locator("div[role='listitem']").filter({ hasText: titleB });

  await itemA.getByRole("button", { name: /지도에서 보기|지도에 표시 중/ }).click();
  await expect(page.getByText(titleA).last()).toBeVisible();

  await itemB.getByRole("button", { name: /지도에서 보기|지도에 표시 중/ }).click();
  await expect(page.getByText(titleB).last()).toBeVisible();
});

test("선택된 매물이 필터로 사라지면 남은 결과 중 첫 번째로 지도 패널이 자동 전환된다", async ({ page }) => {
  const customer = await createIsolatedCustomer("map-filter-reselect");
  await loginViaSession(page, customer.email);
  const jeonseTitle = `E2E지도재선택전세-${Date.now()}`;
  const maemaeTitle = `E2E지도재선택매매-${Date.now()}`;

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(jeonseTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 역삼동 4");
  await page.getByLabel("거래 유형", { exact: false }).selectOption("전세");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(maemaeTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 역삼동 5");
  await page.getByLabel("거래 유형", { exact: false }).selectOption("매매");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });

  // 매매 매물을 선택해둔 채로 필터를 전세만 남도록 바꾼다.
  await explorerList
    .locator("div[role='listitem']")
    .filter({ hasText: maemaeTitle })
    .getByRole("button", { name: /지도에서 보기|지도에 표시 중/ })
    .click();
  await expect(page.getByText(maemaeTitle).last()).toBeVisible();

  await page.getByRole("combobox", { name: "거래 유형" }).selectOption("전세");

  // 선택돼 있던 매매 매물은 더 이상 안 보이고, 남은 전세 매물로 자동 전환된다.
  await expect(page.getByText(maemaeTitle)).toHaveCount(0);
  await expect(page.getByText(jeonseTitle).last()).toBeVisible();
});

test("좌표가 있는 매물은 '위치 확인 필요' 배지가 없고, 좌표가 없는 매물에는 계속 보인다", async ({ page }) => {
  const customer = await createIsolatedCustomer("map-location-badge");
  await loginViaSession(page, customer.email);
  const withCoordsTitle = `E2E좌표있음-${Date.now()}`;
  const withoutCoordsTitle = `E2E좌표없음-${Date.now()}`;

  await saveDirectCandidate(page, withCoordsTitle, "서울특별시 강남구 역삼동 6");
  await saveDirectCandidate(page, withoutCoordsTitle, "서울특별시 강남구 역삼동 7");
  await seedCoordinates(withCoordsTitle, 37.5, 127.03);

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  const withCoordsItem = explorerList.locator("div[role='listitem']").filter({ hasText: withCoordsTitle });
  const withoutCoordsItem = explorerList.locator("div[role='listitem']").filter({ hasText: withoutCoordsTitle });

  await expect(withCoordsItem.getByText("위치 확인 필요")).toHaveCount(0);
  await expect(withoutCoordsItem.getByText("위치 확인 필요")).toBeVisible();
});

test("모바일에서 좌표가 있어도 지도 SDK가 미설정이면 첫 화면은 결국 목록으로 정착한다", async ({ page }) => {
  const customer = await createIsolatedCustomer("map-mobile-fallback-settle");
  await loginViaSession(page, customer.email);
  const title = `E2E모바일좌표있음-${Date.now()}`;
  await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 8");
  await seedCoordinates(title, 37.5, 127.03);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/my/candidate-properties");

  // 좌표가 있으니 처음에는 지도 화면을 시도하지만, SDK가 미설정(E2E 고정
  // 상태)이라 자동으로 목록 화면에 정착한다 — item 5의 "SDK가 실패하면
  // 목록을 먼저 표시" 요구사항이 실제로 동작하는지 확인한다.
  const listTab = page.getByRole("button", { name: "목록 보기" });
  await expect(listTab).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("list", { name: "매물 후보 목록" })).toBeVisible();
});

test("URL 필터를 통해 직접 진입하면, 전체 목록이 아니라 그 필터가 적용된 결과 기준으로 첫 화면이 정해진다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("map-url-filter-entry");
  await loginViaSession(page, customer.email);
  const withCoordsTitle = `E2EURL필터좌표있음-${Date.now()}`;
  const withoutCoordsTitle = `E2EURL필터좌표없음-${Date.now()}`;

  // 좌표가 있는 매물은 매매, 좌표가 없는 매물은 전세로 등록한다.
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(withCoordsTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 역삼동 11");
  await page.getByLabel("거래 유형", { exact: false }).selectOption("매매");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  await seedCoordinates(withCoordsTitle, 37.5, 127.03);

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(withoutCoordsTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 역삼동 12");
  await page.getByLabel("거래 유형", { exact: false }).selectOption("전세");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  // 목록 화면을 한 번도 거치지 않고, 좌표 있는 매물이 필터로 걸러지는
  // URL로 곧바로("첫 진입") 들어간다 — 전체 목록에는 좌표가 있어도, 이
  // 필터가 적용된 첫 화면에는 좌표가 하나도 없어야 한다.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/my/candidate-properties?transaction=%EC%A0%84%EC%84%B8"); // transaction=전세

  await expect(page.getByRole("combobox", { name: "거래 유형" })).toHaveValue("전세");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await expect(explorerList.getByText(withoutCoordsTitle)).toBeVisible();
  await expect(explorerList.getByText(withCoordsTitle)).toHaveCount(0);

  // 필터링된 첫 화면에 좌표가 없으므로 목록이 먼저 보인다(전체 목록
  // 기준으로 판단했다면 좌표가 있어 지도를 먼저 시도했을 것이다).
  await expect(page.getByRole("button", { name: "목록 보기" })).toHaveAttribute("aria-pressed", "true");
  await expect(explorerList).toBeVisible();
});

test("지도 SDK가 미설정이어도 매물 후보 목록·검색·필터는 정상 동작한다(지도 실패가 목록을 막지 않는다)", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("map-failure-does-not-block-list");
  await loginViaSession(page, customer.email);
  const title = `E2E지도실패목록정상-${Date.now()}`;
  await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 9");
  await seedCoordinates(title, 37.5, 127.03);

  await page.goto("/my/candidate-properties");
  const explorerList = page.getByRole("list", { name: "매물 후보 목록" });
  await expect(explorerList.getByText(title)).toBeVisible();

  await page.getByPlaceholder("매물 이름, 주소, 프로젝트명으로 검색").fill(title);
  await expect(explorerList.getByText(title)).toBeVisible();
});

test.describe("매물 탐색 인터랙티브 지도 — 주요 viewport에서 가로 오버플로가 없다", () => {
  test("좌표가 있는 매물이 있어도 320~1366px에서 넘치지 않는다", async ({ page }) => {
    const customer = await createIsolatedCustomer("map-responsive");
    await loginViaSession(page, customer.email);
    const title = `E2E지도영역반응형-${Date.now()}`;
    await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 10");
    await seedCoordinates(title, 37.5, 127.03);

    await page.goto("/my/candidate-properties");
    await checkWidths(page, [320, 390, 430, 768, 1024, 1366]);
  });
});

/**
 * E2E는 NCP SDK가 항상 "미설정" 상태로 고정된다(파일 헤더 설명) — 좌표가
 * 있어도 handleMapStatusChange가 모바일 첫 화면을 자동으로 목록에 정착시킨다
 * (위의 "결국 목록으로 정착한다" 테스트). 그래서 "성공한 SDK가 첫 화면부터
 * 지도를 자동으로 보여주는 순간"은 결정적으로 재현할 수 없다 — 대신 사용자가
 * 직접 "지도 보기"를 눌러 userToggledViewRef를 세운 상태(자동 되돌림이
 * 걸리지 않는 상태)로 만들어, 성공한 SDK와 완전히 같은 컨테이너 위치·높이를
 * 결정적으로 검증한다. 즉 여기서 확인하는 것은 "지도가 실제로 로드됐는가"가
 * 아니라 "지도 컨테이너가 첫 화면 안에 들어오는 레이아웃인가"이고, 이 값은
 * SDK 성공 여부와 무관하다(같은 className·같은 DOM 위치를 쓰기 때문).
 */
test.describe("모바일 첫 화면에서 지도를 스크롤 없이 인지·사용할 수 있다", () => {
  test("390px — '지도 보기'로 전환하면 지도 패널이 첫 화면과 실제로 교차하고 의미 있는 영역이 보인다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("map-first-viewport-390");
    await loginViaSession(page, customer.email);
    const title = `E2E390첫뷰포트-${Date.now()}`;
    await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 17");
    await seedCoordinates(title, 37.5, 127.03);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/my/candidate-properties");
    await page.getByRole("button", { name: "지도 보기" }).click();

    const mapRegion = page.getByRole("region", { name: "매물 위치 지도" });
    // 픽셀 좌표 대신 실제 가시 영역 비율로 확인한다 — 지도 영역의
    // 최소 40% 이상이 스크롤 없이 뷰포트 안에 들어와야 "인지 가능"으로 본다.
    await expect(mapRegion).toBeInViewport({ ratio: 0.4 });
  });

  test("320px — 지도 전환 버튼은 스크롤 없이 첫 화면에 있고, 전환 직후 별도 스크롤 없이 의미 있는 지도 영역이 보이며, 목록으로 복귀할 수 있다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("map-320-toggle-and-size");
    await loginViaSession(page, customer.email);
    const title = `E2E320토글크기-${Date.now()}`;
    await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 18");
    await seedCoordinates(title, 37.5, 127.03);

    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto("/my/candidate-properties");

    const mapToggle = page.getByRole("button", { name: "지도 보기" });
    await expect(mapToggle).toBeInViewport();

    await mapToggle.click();
    const mapRegion = page.getByRole("region", { name: "매물 위치 지도" });
    await expect(mapRegion).toBeInViewport({ ratio: 0.3 });

    await page.getByRole("button", { name: "← 목록으로" }).click();
    await expect(page.getByRole("list", { name: "매물 후보 목록" })).toBeVisible();
    await expect(mapRegion).toBeHidden();
  });

  test("844×390 가로 모드 — 지도 전환 직후 지도와 '← 목록으로' 버튼이 뷰포트 안에 있고, 하단 내비게이션이 지도를 가리지 않으며, 가로 오버플로가 없다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("map-landscape-844x390");
    await loginViaSession(page, customer.email);
    const title = `E2E가로모드-${Date.now()}`;
    await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 20");
    await seedCoordinates(title, 37.5, 127.03);

    await page.setViewportSize({ width: 844, height: 390 });
    await page.goto("/my/candidate-properties");
    await page.getByRole("button", { name: "지도 보기" }).click();

    const backButton = page.getByRole("button", { name: "← 목록으로" });
    const mapRegion = page.getByRole("region", { name: "매물 위치 지도" });
    await expect(backButton).toBeInViewport();
    await expect(mapRegion).toBeInViewport({ ratio: 0.2 });

    // 하단 고정 내비게이션은 항상 뷰포트 맨 아래에 붙어 있으므로, 뷰포트보다
    // 긴 어떤 콘텐츠든 그 스크롤 위치에서는 바닥 쪽 일부와 겹칠 수밖에
    // 없다(그 자체는 정상 — fixed 내비의 기본 동작이다). 여기서 확인할
    // 것은 "전혀 안 겹침"이 아니라 "내비 위로 실제 조작 가능한 지도
    // 영역이 의미 있게 남아 있는가"다 — 지도 영역 시작(y)이 내비 시작보다
    // 위에 있고, 그 사이 공간이 손가락으로 조작할 만한 최소 높이(80px)
    // 이상인지 확인한다.
    const nav = page.getByRole("navigation", { name: "고객 메뉴" });
    const [navBox, mapBox] = await Promise.all([nav.boundingBox(), mapRegion.boundingBox()]);
    expect(navBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    if (navBox && mapBox) {
      const unobstructedMapHeight = navBox.y - mapBox.y;
      expect(
        unobstructedMapHeight,
        `하단 내비게이션 위로 조작 가능한 지도 영역이 부족함: ${unobstructedMapHeight}px`,
      ).toBeGreaterThanOrEqual(80);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(
      true,
    );
  });

  test("모바일 지도 모드에서는 검색·필터가 선택 요약 아래로, 목록 모드에서는 목록 위로 정확히 한 번만 나타난다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("map-mode-order");
    await loginViaSession(page, customer.email);
    const title = `E2E순서확인-${Date.now()}`;
    await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 21");
    await seedCoordinates(title, 37.5, 127.03);

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/my/candidate-properties");

    // 목록 모드: 검색·필터가 목록보다 먼저(위) 나온다. 정확히 한 곳에만 있다.
    await expect(page.locator("#explorer-search")).toHaveCount(1);
    const listModeOrder = await page.evaluate(() => {
      const search = document.getElementById("explorer-search")!.getBoundingClientRect().top;
      const list = document.querySelector('[role="list"][aria-label="매물 후보 목록"]')!.getBoundingClientRect().top;
      return search < list;
    });
    expect(listModeOrder, "목록 모드에서 검색·필터가 목록보다 위에 있어야 함").toBe(true);

    // 지도 모드: 복귀 → 지도 → 선택 요약 → 검색·필터 순서, 여전히 한 곳에만.
    await page.getByRole("button", { name: "지도 보기" }).click();
    await expect(page.locator("#explorer-search")).toHaveCount(1);
    const mapModeOrder = await page.evaluate(() => {
      const top = (sel: string) => document.querySelector(sel)!.getBoundingClientRect().top;
      const backTop = Array.from(document.querySelectorAll("button"))
        .find((b) => b.textContent?.includes("목록으로"))!
        .getBoundingClientRect().top;
      const mapTop = top('[role="region"][aria-label="매물 위치 지도"]');
      const searchTop = top("#explorer-search");
      return { backTop, mapTop, searchTop };
    });
    expect(mapModeOrder.backTop, "복귀 버튼이 지도보다 위에 있어야 함").toBeLessThan(mapModeOrder.mapTop);
    expect(mapModeOrder.mapTop, "지도가 검색·필터보다 위에 있어야 함").toBeLessThan(mapModeOrder.searchTop);
  });

  test("1023px — 아직 모바일 전환형 UI이고, 1024px — 목록·지도 분할 구조로 전환되며 CTA·검색·필터 배치는 그대로다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("map-split-1023-1024");
    await loginViaSession(page, customer.email);
    const title = `E2E1023분기-${Date.now()}`;
    await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 22");
    await seedCoordinates(title, 37.5, 127.03);

    await page.goto("/my/candidate-properties");

    await page.setViewportSize({ width: 1023, height: 800 });
    await expect(page.getByRole("button", { name: "목록 보기" })).toBeVisible();
    await expect(page.getByRole("button", { name: "지도 보기" })).toBeVisible();

    await page.setViewportSize({ width: 1024, height: 800 });
    await expect(page.getByRole("button", { name: "목록 보기" })).toBeHidden();
    await expect(page.getByRole("button", { name: "지도 보기" })).toBeHidden();
    await expect(page.locator("#explorer-search")).toHaveCount(1);

    const listBox = await page.getByRole("list", { name: "매물 후보 목록" }).boundingBox();
    const mapBox = await page.getByRole("region", { name: "매물 위치 지도" }).boundingBox();
    const searchBox = await page.locator("#explorer-search").boundingBox();
    expect(listBox).not.toBeNull();
    expect(mapBox).not.toBeNull();
    expect(searchBox).not.toBeNull();
    if (listBox && mapBox && searchBox) {
      expect(mapBox.x, "1024px에서는 목록 오른쪽에 지도가 나란히 있어야 함").toBeGreaterThan(
        listBox.x + listBox.width - 10,
      );
      expect(searchBox.y, "데스크톱에서는 검색·필터가 목록·지도보다 위에 있어야 함").toBeLessThan(listBox.y);
    }
  });
});

test.describe("매물 후보 상단 빠른 추가 진입점", () => {
  test("매물이 1건 이상이면 제목 옆에 작은 '+ 매물 후보 추가' 링크가 보이고, 320px에서도 화면 밖으로 넘치지 않는다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("top-add-entry-point");
    await loginViaSession(page, customer.email);
    const title = `E2E상단추가진입점-${Date.now()}`;
    await saveDirectCandidate(page, title, "서울특별시 강남구 역삼동 23");

    await page.goto("/my/candidate-properties");
    const topAddLink = page.getByRole("link", { name: "+ 매물 후보 추가" });
    await expect(topAddLink).toBeVisible();
    // 44px 최소 터치 영역.
    const box = await topAddLink.boundingBox();
    expect(box).not.toBeNull();
    if (box) expect(box.height).toBeGreaterThanOrEqual(44);

    await page.setViewportSize({ width: 320, height: 700 });
    await expect(
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1),
    ).resolves.toBe(true);

    await topAddLink.click();
    await page.waitForURL("**/my/candidate-properties/new");
  });

  test("매물이 하나도 없으면 상단 빠른 추가 링크는 없고, 기존 빈 상태 안내와 하단 CTA는 그대로 보인다", async ({
    page,
  }) => {
    const customer = await createIsolatedCustomer("top-add-entry-empty");
    await loginViaSession(page, customer.email);

    await page.goto("/my/candidate-properties");
    await expect(page.getByRole("link", { name: "+ 매물 후보 추가" })).toHaveCount(0);
    await expect(page.getByText("아직 매물 후보가 없습니다.")).toBeVisible();
    await expect(page.getByRole("link", { name: "매물 후보 추가" })).toBeVisible();
    await expect(page.getByText("네이버페이 부동산에서 매물 찾기 ↗")).toBeVisible();
  });
});
