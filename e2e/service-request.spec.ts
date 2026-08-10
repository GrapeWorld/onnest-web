import { test, expect } from "./test-base";
import { login, createProject, requestMovingService } from "./helpers";
import { E2E_CUSTOMER } from "./fixtures";

test("고객이 프로젝트에서 이사 서비스를 신청할 수 있다", async ({ page }) => {
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

  const projectId = await createProject(page, `E2E서비스신청-${Date.now()}`);
  await requestMovingService(page, projectId, "남양주시 별내동");

  await expect(page.getByRole("heading", { name: "신청 내역 1건" })).toBeVisible();
  await expect(page.getByText("신규").first()).toBeVisible();
  await expect(page.getByText("남양주시 별내동")).toBeVisible();
});
