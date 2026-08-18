import { test, expect } from "./test-base";
import { loginViaSession, expectNoHorizontalOverflow } from "./helpers";
import { E2E_CUSTOMER } from "./fixtures";

const CHECK_VIEWPORTS: { width: number; height: number }[] = [
  { width: 320, height: 568 },
  { width: 360, height: 800 },
  { width: 390, height: 844 },
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1366, height: 768 },
];

/**
 * 서비스 소개 페이지 개편(Hero → 할 수 있는 일 3가지 → 이용 방법 3단계 →
 * 연결 가능한 서비스 → 신뢰 안내·CTA) 회귀 테스트.
 */
test("비로그인 사용자에게는 시작하기와 기존 회원 로그인이 표시된다", async ({ page }) => {
  await page.goto("/service");

  await expect(page.getByRole("link", { name: "입주 준비 시작하기" }).first()).toHaveAttribute(
    "href",
    "/auth/signup",
  );
  await expect(page.getByRole("link", { name: "기존 회원 로그인" })).toHaveAttribute(
    "href",
    "/auth/login",
  );
});

test("로그인한 사용자에게는 적절한 시작 버튼이 표시되고 로그인 링크는 보이지 않는다", async ({ page }) => {
  await loginViaSession(page, E2E_CUSTOMER.email);
  await page.goto("/service");

  const startLinks = page.getByRole("link", { name: "입주 준비 시작하기" });
  await expect(startLinks.first()).toHaveAttribute("href", "/my");
  await expect(page.getByRole("link", { name: "기존 회원 로그인" })).toHaveCount(0);
});

test("'이용 방법 보기'를 누르면 #how-it-works로 이동한다", async ({ page }) => {
  await page.goto("/service");
  await page.getByRole("link", { name: "이용 방법 보기" }).click();
  await expect(page).toHaveURL(/#how-it-works$/);
  await expect(page.getByRole("heading", { name: "이용 방법은 세 단계입니다." })).toBeInViewport();
});

test("운영 원칙 링크는 /policy/safety로 이동한다", async ({ page }) => {
  await page.goto("/service");
  await page.getByRole("link", { name: "운영 원칙 자세히 보기" }).click();
  await expect(page).toHaveURL(/\/policy\/safety$/);
});

test("기존 핵심 상세 페이지 링크(입주 준비·생활 정보)가 유지된다", async ({ page }) => {
  await page.goto("/service");

  const hrefs = await page.locator('main a[href="/move-in"], main a[href="/handover"]').evaluateAll(
    (els) => els.map((el) => el.getAttribute("href")),
  );
  expect(hrefs).toContain("/move-in");
  expect(hrefs).toContain("/handover");
});

test("입주 준비 전체 단계 보기 링크는 /move-in으로 이동한다", async ({ page }) => {
  await page.goto("/service");
  await page.getByRole("link", { name: "입주 준비 전체 단계 보기" }).click();
  await expect(page).toHaveURL(/\/move-in$/);
});

// /service는 e2e/responsive-sweep.spec.ts에서 320~1366px 연속 스윕으로도
// 검사된다 — 여기서는 요청받은 정확한 viewport(가로 모드 포함) 조합만
// 대표로 한 번 더 확인해 중복 실행 시간을 늘리지 않는다.
for (const { width, height } of CHECK_VIEWPORTS) {
  test(`${width}×${height}에서 서비스 소개 페이지는 가로 오버플로가 없다`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/service");
    await expectNoHorizontalOverflow(page, `${width}×${height} 서비스 소개`);
  });
}
