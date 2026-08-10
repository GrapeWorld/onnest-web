import { test, expect } from "./test-base";
import { login, createProject } from "./helpers";
import { E2E_CUSTOMER } from "./fixtures";

test("고객이 새 입주 프로젝트를 생성할 수 있다", async ({ page }) => {
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

  const name = `E2E프로젝트-${Date.now()}`;
  const projectId = await createProject(page, name);

  expect(projectId).toBeTruthy();
  await expect(page.getByRole("heading", { name })).toBeVisible();
  await expect(page.getByText("아파트 · 주소 미입력")).toBeVisible();

  // 마이페이지 목록에도 반영되는지 확인한다.
  await page.goto("/my");
  await expect(page.getByRole("heading", { name, exact: true })).toBeVisible();
});
