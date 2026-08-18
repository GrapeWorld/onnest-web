import { test, expect } from "./test-base";
import { E2E_CUSTOMER } from "./fixtures";
import { expectNoHorizontalOverflow } from "./helpers";

/**
 * 세로 높이가 짧은 휴대폰 가로 화면(예: 844×390)에서도 폼과 제출 버튼에
 * 세로 스크롤로 도달할 수 있어야 한다. sticky 헤더 같은 고정 요소가 실제
 * 콘텐츠를 가려서는 안 된다.
 */
const LANDSCAPE_SIZES: [number, number, string][] = [
  [568, 320, "568×320"],
  [667, 375, "667×375"],
  [844, 390, "844×390"],
];

for (const [width, height, label] of LANDSCAPE_SIZES) {
  test(`${label} 가로 화면에서 로그인 폼과 제출 버튼에 스크롤로 도달할 수 있다`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/auth/login");

    const emailInput = page.getByRole("textbox", { name: "이메일" });
    await emailInput.scrollIntoViewIfNeeded();
    await expect(emailInput).toBeVisible();
    await emailInput.fill(E2E_CUSTOMER.email);
    await page.getByRole("textbox", { name: "비밀번호" }).fill(E2E_CUSTOMER.password);

    const submit = page.getByRole("button", { name: "로그인" });
    await submit.scrollIntoViewIfNeeded();
    await expect(submit).toBeVisible();
    await expect(submit).toBeInViewport();

    // sticky 헤더가 제출 버튼을 가리지 않는지 — 버튼의 화면상 y좌표가
    // 헤더 높이보다 아래에 있어야 클릭 가능하다.
    const headerBox = await page.locator("header").boundingBox();
    const submitBox = await submit.boundingBox();
    if (headerBox && submitBox) {
      expect(submitBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height - 1);
    }

    await submit.click();
    await page.waitForURL("**/my");
    await expectNoHorizontalOverflow(page, `${label} 마이페이지`);
  });
}
