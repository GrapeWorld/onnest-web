import { test, expect } from "./test-base";
import { E2E_CUSTOMER } from "./fixtures";

/**
 * 브라우저 확대(사용자가 OS/브라우저에서 글자 크기를 키우는 것)를 막는
 * viewport 설정이 없는지 먼저 확인하고, 텍스트 배율을 올렸을 때도 핵심
 * 기능(로그인, 마이페이지 진입)이 그대로 동작하는지 확인한다. 실제 브라우저
 * 확대(pinch-zoom)는 Playwright가 직접 흉내내기 어려워, rem 기반 Tailwind
 * 크기가 함께 커지는 root font-size 배율(OS 접근성 "글자 크기 크게"와
 * 동일한 효과)로 근사한다.
 */
test("viewport meta가 확대를 막지 않는다", async ({ page }) => {
  await page.goto("/");
  const content = await page.evaluate(
    () => document.querySelector('meta[name="viewport"]')?.getAttribute("content") ?? "",
  );
  expect(content).not.toMatch(/user-scalable\s*=\s*no/i);
  expect(content).not.toMatch(/maximum-scale\s*=\s*1(\.0)?\b/);
});

const ZOOM_LEVELS = [100, 125, 150, 200];

for (const zoom of ZOOM_LEVELS) {
  test(`텍스트 배율 ${zoom}%에서도 로그인부터 마이페이지까지 핵심 기능을 쓸 수 있다`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/auth/login");
    await page.addStyleTag({ content: `html { font-size: ${zoom}% !important; }` });

    await page.getByRole("textbox", { name: "이메일" }).fill(E2E_CUSTOMER.email);
    await page.getByRole("textbox", { name: "비밀번호" }).fill(E2E_CUSTOMER.password);
    const submit = page.getByRole("button", { name: "로그인" });
    await expect(submit).toBeVisible();
    await submit.scrollIntoViewIfNeeded();
    await submit.click();
    await page.waitForURL("**/my");

    await page.addStyleTag({ content: `html { font-size: ${zoom}% !important; }` });
    await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
    // 전환 직후 폰트·레이아웃이 완전히 안정되기 전 순간을 오탐으로 잡지
    // 않도록, 값이 몇 프레임 연속 안정적으로 유지될 때까지 기다린다.
    await page.waitForLoadState("networkidle");

    // 글자 확대 시 세로 스크롤이 늘어나는 건 정상이지만, 가로 스크롤이
    // 새로 생기면 안 된다.
    await expect(async () => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${zoom}% 배율에서 가로 오버플로 발생`).toBeLessThanOrEqual(0);
    }).toPass({ timeout: 3000 });
  });
}
