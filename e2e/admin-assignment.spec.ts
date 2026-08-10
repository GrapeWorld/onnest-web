import { test, expect } from "./test-base";
import { login, logout, createProject, requestMovingService, assignPartnerViaAdmin } from "./helpers";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PARTNER_NAME, E2E_PARTNER_OWNER } from "./fixtures";

test("관리자가 서비스 신청에 업체를 배정하면 업체 포털에 즉시 노출된다", async ({ page }) => {
  const projectName = `E2E업체배정-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동");
  await logout(page);

  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);
  await logout(page);

  await login(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
  await page.goto("/partner");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();

  await expect(page.getByText("검색 결과 1건")).toBeVisible();
  await expect(page.getByText(projectName)).toBeVisible();
});
