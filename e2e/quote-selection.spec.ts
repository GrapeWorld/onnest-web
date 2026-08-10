import { test, expect } from "./test-base";
import {
  login,
  logout,
  createProject,
  requestMovingService,
  assignPartnerViaAdmin,
  acceptAndQuoteAsPartner,
} from "./helpers";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PARTNER_NAME, E2E_PARTNER_OWNER } from "./fixtures";

test("업체가 등록한 견적을 고객이 확인하고 선택할 수 있다", async ({ page }) => {
  const projectName = `E2E견적선택-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동");
  await logout(page);

  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);
  await logout(page);

  await login(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
  await acceptAndQuoteAsPartner(page, projectName, "기본형", 350000);
  await logout(page);

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/projects/${projectId}/services`);

  await expect(page.getByText("받은 견적 1건")).toBeVisible();
  await expect(page.getByText("기본형 · 350,000원")).toBeVisible();

  await page.getByRole("button", { name: "이 견적 선택" }).click();
  await expect(page.getByText("선택한 견적")).toBeVisible();
});
