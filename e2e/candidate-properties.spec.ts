import { test, expect } from "./test-base";
import { PrismaClient } from "@prisma/client";
import { login, loginViaSession, expectNoHorizontalOverflow, expectControlsWithinViewport } from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_CUSTOMER } from "./fixtures";

const NAVER_LISTING_URL = "https://fin.land.naver.com/complexes/12345";

/**
 * 같은 고객이 같은 sourceUrl로 매물 후보를 두 번 등록하면 이제 서버가
 * 중복으로 막는다(관심 매물 공유 기능 도입 시 추가) — 이 파일의 여러
 * 테스트가 E2E_CUSTOMER로 매물을 만들고 지우지 않은 채 끝나므로, 매번 새
 * URL을 써서 테스트 간 충돌을 피한다.
 */
let uniqueUrlCounter = 0;
function uniqueNaverListingUrl() {
  uniqueUrlCounter += 1;
  return `https://fin.land.naver.com/complexes/${Date.now()}-${uniqueUrlCounter}`;
}

test("고객이 매물 후보를 등록·조회·수정·삭제할 수 있다", async ({ page }) => {
  const title = `E2E매물-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my");
  await page.getByRole("link", { name: "매물 후보 추가" }).click();
  await page.waitForURL("**/my/candidate-properties/new");

  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(NAVER_LISTING_URL);
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 테헤란로 123");
  await page.getByLabel("거래 유형", { exact: false }).selectOption("전세");
  await page.getByRole("spinbutton", { name: "보증금(원)", exact: false }).fill("300000000");
  await page.getByRole("spinbutton", { name: "전용면적(㎡)", exact: false }).fill("59.8");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();

  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByText("서울특별시 강남구 테헤란로 123")).toBeVisible();
  await expect(page.getByText("네이버페이 부동산")).toBeVisible();

  // 목록에도 나타난다. 탐색 화면 자체가 선택된 매물을 목록·지도 패널
  // 양쪽에 보여주므로(이 페이지의 핵심 요구사항), 목록 영역으로 좁혀서
  // 찾아야 지도 패널 쪽 중복 표시와 헷갈리지 않는다. 카드를 CSS 클래스가
  // 아니라 PropertyExplorer가 제공하는 role(list/listitem)로 찾아 스타일
  // 클래스가 바뀌어도 테스트가 깨지지 않게 한다.
  await page.goto("/my/candidate-properties");
  const card = page
    .getByRole("list", { name: "매물 후보 목록" })
    .getByRole("listitem")
    .filter({ hasText: title });
  await expect(card).toBeVisible();

  // 수정
  await card.getByRole("link", { name: "상세보기 →" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);
  await page.getByRole("link", { name: "정보 수정" }).click();
  await page.waitForURL(/\/edit$/);
  const memoField = page.getByRole("textbox", { name: "메모", exact: false });
  await memoField.fill("수정된 메모입니다.");
  await page.getByRole("button", { name: "수정 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);
  await expect(page.getByText("수정된 메모입니다.")).toBeVisible();

  // 삭제
  await page.getByRole("button", { name: "매물 후보 삭제" }).click();
  await page.getByRole("button", { name: "삭제 확정" }).click();
  await page.waitForURL("**/my/candidate-properties");
  await expect(page.getByText(title)).toHaveCount(0);
});

test("지도 API가 미설정이어도 실제 주소를 넣은 매물이 정상 저장·표시된다", async ({ page }) => {
  const title = `E2E지도미설정-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 테헤란로 123");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();

  // 지도 API가 (E2E에서는 항상) 미설정이라 좌표 캐시가 채워지지 않고,
  // 주소는 그대로 텍스트로만 보인다 — 화면이 깨지거나 저장이 실패하지 않는다.
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);
  await expect(page.getByText("서울특별시 강남구 테헤란로 123")).toBeVisible();
  await expect(page.getByRole("img", { name: /위치 지도/ })).toHaveCount(0);
  await expect(page.getByText("지도 제공")).toHaveCount(0);

  // 직접 이미지 프록시를 호출해도(예: 지도 섹션이 있었다면 나갔을 요청)
  // 500으로 서버가 죽지 않고 명확한 404를 돌려준다 — 좌표가 아예 없기 때문.
  const match = page.url().match(/\/my\/candidate-properties\/([a-z0-9]+)$/);
  const candidateId = match?.[1];
  const mapResponse = await page.request.get(`/api/my/candidate-properties/${candidateId}/map`);
  expect(mapResponse.status()).toBe(404);
});

test("원본 매물 URL 검증 — javascript: 스킴은 거부되고 저장되지 않는다", async ({ page }) => {
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my/candidate-properties/new");

  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill("javascript:alert(1)");
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill("위험한 URL 테스트");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();

  await expect(page.getByText(/http 또는 https로 시작하는/)).toBeVisible();
  // 저장이 안 됐으니 여전히 등록 화면에 머문다.
  await expect(page).toHaveURL(/\/new$/);
});

test("외부 매물 링크는 새 탭·보안 속성으로 열린다", async ({ page }) => {
  const listingUrl = uniqueNaverListingUrl();
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(listingUrl);
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(`E2E보안속성-${Date.now()}`);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);

  const originalLink = page.getByRole("link", { name: "원본 매물 보기" });
  await expect(originalLink).toHaveAttribute("target", "_blank");
  await expect(originalLink).toHaveAttribute("rel", /noopener/);
  await expect(originalLink).toHaveAttribute("rel", /noreferrer/);
  await expect(originalLink).toHaveAttribute("href", listingUrl);

  // 마이페이지의 "네이버페이 부동산에서 매물 찾기" 링크도 같은 속성이어야 한다.
  await page.goto("/my");
  const naverLink = page.getByRole("link", { name: /네이버페이 부동산에서 매물 찾기/ });
  await expect(naverLink).toHaveAttribute("target", "_blank");
  await expect(naverLink).toHaveAttribute("rel", /noopener/);
  await expect(naverLink).toHaveAttribute("rel", /noreferrer/);
  await expect(naverLink).toHaveAttribute("href", "https://fin.land.naver.com/home");
});

test("희망 조건을 저장하면 저장한 매물과의 일치·불일치가 표시된다", async ({ page }) => {
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

  await page.goto("/my/candidate-properties");
  await page.getByRole("button", { name: "희망 조건 설정" }).click();
  await page.getByRole("textbox", { name: "희망 지역", exact: false }).fill("강남구");
  await page.getByRole("spinbutton", { name: "최소 예산(원)", exact: false }).fill("100000000");
  await page.getByRole("spinbutton", { name: "최대 예산(원)", exact: false }).fill("400000000");
  await page.getByRole("spinbutton", { name: "최소 면적(㎡)", exact: false }).fill("50");
  // "희망 지역"이라는 텍스트 자체는 폼이 열린 채(저장 중·실패) 있을 때도
  // 입력창 라벨로 계속 보이므로, 그것만으로는 저장 성공을 증명하지 못한다
  // — PUT 응답을 직접 기다리고 성공(res.ok)까지 확인한 뒤, 저장 성공 시에만
  // 나타나는 "조건 수정" 버튼(폼이 접힌 요약 상태)으로 판단한다.
  const [preferenceResponse] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/api/my/property-preference") && res.request().method() === "PUT",
    ),
    page.getByRole("button", { name: "희망 조건 저장" }).click(),
  ]);
  expect(preferenceResponse.ok()).toBe(true);
  await expect(page.getByRole("button", { name: "조건 수정" })).toBeVisible();

  const title = `E2E조건비교-${Date.now()}`;
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 강남구 역삼동 100");
  await page.getByRole("spinbutton", { name: "보증금(원)", exact: false }).fill("200000000");
  await page.getByRole("spinbutton", { name: "전용면적(㎡)", exact: false }).fill("60");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);

  await expect(page.getByRole("heading", { name: "희망 조건 비교" })).toBeVisible();
  const budgetRow = page.locator("li", { hasText: "예산" });
  await expect(budgetRow.getByText("일치", { exact: true })).toBeVisible();
  const areaRow = page.locator("li", { hasText: "면적" });
  await expect(areaRow.getByText("일치", { exact: true })).toBeVisible();
});

test("다른 고객은 남의 매물 후보를 조회·수정·삭제할 수 없다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const otherEmail = `e2e.other-customer-${Date.now()}@onnesthome.com`;

  let candidateId: string;
  try {
    const other = await prisma.user.create({
      data: { email: otherEmail, name: "다른 고객" },
    });
    const candidate = await prisma.candidateProperty.create({
      data: {
        userId: other.id,
        sourceUrl: NAVER_LISTING_URL,
        title: `E2E격리테스트-${Date.now()}`,
      },
    });
    candidateId = candidate.id;
  } finally {
    await prisma.$disconnect();
  }

  await loginViaSession(page, E2E_CUSTOMER.email);

  // 상세 화면 직접 접근 — 존재 여부를 드러내지 않고 찾을 수 없음으로 처리된다.
  await page.goto(`/my/candidate-properties/${candidateId}`);
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();

  // API로도 수정·삭제할 수 없다.
  const patchResponse = await page.request.patch(`/api/my/candidate-properties/${candidateId}`, {
    data: { title: "가로채기 시도" },
  });
  expect(patchResponse.status()).toBe(404);

  const deleteResponse = await page.request.delete(`/api/my/candidate-properties/${candidateId}`);
  expect(deleteResponse.status()).toBe(404);

  // 실제로 안 지워졌는지 원 소유자 관점에서 다시 확인한다.
  const verifyPrisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    const stillExists = await verifyPrisma.candidateProperty.findUnique({ where: { id: candidateId } });
    expect(stillExists).not.toBeNull();
    expect(stillExists?.title).not.toBe("가로채기 시도");
  } finally {
    await verifyPrisma.$disconnect();
  }
});

test("최종 후보를 선택하면 프로젝트 생성 위저드로 연결되고, 완료 후 프로젝트와 서로 참조한다", async ({ page }) => {
  const title = `E2E프로젝트연결-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 마포구 합정동 1");
  await page.getByRole("spinbutton", { name: "보증금(원)", exact: false }).fill("250000000");
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);

  await page.getByRole("button", { name: "이 매물로 프로젝트 만들기" }).click();
  await page.waitForURL("**/projects/new");

  // 주소가 미리 채워져 있어야 한다(위저드 자체는 그대로 재사용).
  await expect(page.getByRole("textbox", { name: "도로명 주소" })).toHaveValue("서울특별시 마포구 합정동 1");

  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "방문 예정" }).click();
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();

  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  await expect(page.getByText(`이 프로젝트는 매물 후보 "${title}"에서 시작되었습니다.`)).toBeVisible();

  await page.getByRole("link", { name: "저장된 매물 정보 보기 →" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);
  await expect(page.getByText("최종 후보", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("이 매물은 이미 프로젝트로 연결되어 있습니다.")).toBeVisible();
});

test("여러 매물을 선택해 비교할 수 있다", async ({ page }) => {
  const titleA = `E2E비교A-${Date.now()}`;
  const titleB = `E2E비교B-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  for (const title of [titleA, titleB]) {
    await page.goto("/my/candidate-properties/new");
    await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
    await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
    await page.getByRole("button", { name: "매물 후보 저장" }).click();
    await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);
  }

  await page.goto("/my/candidate-properties/compare");
  await page.getByRole("checkbox", { name: titleA }).check();
  await page.getByRole("checkbox", { name: titleB }).check();

  // 선택 목록 체크박스 라벨과 비교 카드 제목 두 곳에 각각 나타나므로 first()로 좁힌다.
  await expect(page.getByText(titleA, { exact: true }).last()).toBeVisible();
  await expect(page.getByText(titleB, { exact: true }).last()).toBeVisible();
  await expectNoHorizontalOverflow(page, "매물 비교 화면 (2건 선택)");
});

test("방문 체크리스트 항목을 켜고 끌 수 있다", async ({ page }) => {
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(`E2E체크리스트-${Date.now()}`);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);

  const checkbox = page.getByRole("checkbox", { name: "소음" });
  await expect(checkbox).not.toBeChecked();
  // 낙관적 업데이트라 체크 자체는 즉시 반영된다 — 새로고침 전에 실제 저장
  // 응답을 기다려야 반영 여부를 정확히 검증할 수 있다.
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/visit-checklist") && res.request().method() === "PUT",
    ),
    checkbox.check(),
  ]);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "소음" })).toBeChecked();
});

test.describe("매물 후보 화면 — 주요 viewport에서 가로 오버플로가 없다", () => {
  test("긴 URL·긴 주소·큰 글자 매물을 등록해도 목록·상세·비교 화면이 넘치지 않는다", async ({ page }) => {
    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

    const longTitle = "아주아주아주아주아주아주아주아주아주아주긴매물이름테스트".repeat(2).slice(0, 80);
    const longAddress = "서울특별시매우매우매우매우매우매우매우매우매우매우매우매우긴주소테스트".repeat(2).slice(0, 150);
    const longUrl = `https://fin.land.naver.com/complexes/12345?ref=${"a".repeat(300)}`;

    await page.goto("/my/candidate-properties/new");
    await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(longUrl);
    await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(longTitle);
    await page.getByRole("textbox", { name: "주소", exact: false }).fill(longAddress);
    await page.getByRole("button", { name: "매물 후보 저장" }).click();
    await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);

    const widths = [320, 360, 375, 390, 412, 480, 768, 820, 1024, 1280];
    await checkWidths(page, widths);
    await expectControlsWithinViewport(page);

    await page.goto("/my/candidate-properties");
    await checkWidths(page, widths);

    await page.goto("/my/candidate-properties/new");
    await checkWidths(page, widths);
  });
});
