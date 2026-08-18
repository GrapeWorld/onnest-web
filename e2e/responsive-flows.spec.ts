import { test, expect } from "./test-base";
import { login, createProject, requestMovingService } from "./helpers";
import { E2E_CUSTOMER } from "./fixtures";

/**
 * 핵심 사용자 흐름(로그인 → 프로젝트 생성 → 서비스 신청)이 대표 모바일,
 * 태블릿 세로, 태블릿 가로에서 각각 최소 1회 끝까지 완료되는지 확인한다.
 */
const VIEWPORTS: [number, number, string][] = [
  [390, 844, "모바일 390×844"],
  [768, 1024, "태블릿 세로 768×1024"],
  [1024, 768, "태블릿 가로 1024×768"],
];

for (const [width, height, label] of VIEWPORTS) {
  test(`${label}에서 로그인부터 서비스 신청까지 핵심 흐름을 완료할 수 있다`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

    const projectId = await createProject(page, `E2E흐름-${label}-${Date.now()}`);
    await requestMovingService(page, projectId, "남양주시 별내동");

    await expect(page.getByRole("heading", { name: "신청 내역 1건" })).toBeVisible();
  });
}
