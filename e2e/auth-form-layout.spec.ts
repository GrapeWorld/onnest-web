import { test, expect } from "./test-base";
import type { Page } from "./test-base";
import { expectNoHorizontalOverflow } from "./helpers";

/**
 * grid로 중첩된 form/label/input 구조는 그리드 자식의 기본 min-width:auto
 * 때문에 좁은 화면에서 카드 밖으로 넘칠 수 있다(실기기에서 실제로 발견된
 * 회귀). 카드 바깥으로 가로 스크롤이 생기지 않는지, 입력창·버튼이 카드
 * 콘텐츠 폭을 넘지 않는지를 여러 뷰포트에서 확인한다.
 */
const widths = [320, 360, 390, 1280];

async function expectControlsWithinCard(page: Page) {
  const cardBox = await page.locator("main >> .rounded-\\[24px\\].border.border-forest\\/10.bg-white").first().boundingBox();
  expect(cardBox, "카드 요소를 찾지 못함").not.toBeNull();
  if (!cardBox) return;

  const controls = page.locator("main input, main button, main a.inline-flex");
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    const box = await controls.nth(i).boundingBox();
    if (!box) continue;
    expect(box.x + box.width, "입력창/버튼이 카드 오른쪽 경계를 벗어남").toBeLessThanOrEqual(
      cardBox.x + cardBox.width + 1,
    );
  }
}

for (const width of widths) {
  test(`${width}px 로그인 화면은 가로 오버플로 없이 카드 안에 들어온다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/auth/login");
    await expectNoHorizontalOverflow(page, `${width}px 로그인`);
    await expectControlsWithinCard(page);
  });
}

for (const width of [320, 390]) {
  test(`${width}px 회원가입 화면은 가로 오버플로 없이 카드 안에 들어온다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/auth/signup");
    await expectNoHorizontalOverflow(page, `${width}px 회원가입`);
    await expectControlsWithinCard(page);
  });

  test(`${width}px 아이디 찾기 화면은 가로 오버플로 없이 카드 안에 들어온다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/auth/find-id");
    await expectNoHorizontalOverflow(page, `${width}px 아이디 찾기`);
    await expectControlsWithinCard(page);
  });

  test(`${width}px 비밀번호 찾기 화면은 가로 오버플로 없이 카드 안에 들어온다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/auth/forgot-password");
    await expectNoHorizontalOverflow(page, `${width}px 비밀번호 찾기`);
    await expectControlsWithinCard(page);
  });

  test(`${width}px 비밀번호 재설정 화면(빈 상태)은 가로 오버플로 없이 카드 안에 들어온다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    // 토큰 없이 접근하는 "유효하지 않은 링크" 빈 상태도 같은 레이아웃을 공유한다.
    await page.goto("/auth/reset-password");
    await expectNoHorizontalOverflow(page, `${width}px 비밀번호 재설정`);
    await expectControlsWithinCard(page);
  });
}
