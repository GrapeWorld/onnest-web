import { test, expect } from "./test-base";
import { E2E_PASSWORD } from "./fixtures";

test("회원가입 후 로그아웃하고 같은 계정으로 다시 로그인할 수 있다", async ({ page }) => {
  const email = `e2e.signup.${Date.now()}@onnesthome.com`;

  await page.goto("/auth/signup");
  await page.getByRole("textbox", { name: "이름" }).fill("E2E가입테스트");
  await page.getByRole("textbox", { name: "이메일" }).fill(email);
  await page.getByRole("textbox", { name: "휴대폰 번호" }).fill("010-9000-0001");
  await page.getByRole("textbox", { name: "비밀번호", exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("textbox", { name: "비밀번호 확인" }).fill(E2E_PASSWORD);
  await page.getByRole("checkbox", { name: /이용약관/ }).check();
  await page.getByRole("button", { name: "회원가입" }).click();

  await page.waitForURL("**/my");
  await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();

  await page.getByRole("banner").getByRole("button", { name: "로그아웃" }).click();
  // 홈 히어로의 "기존 회원 로그인" 링크도 "로그인"을 부분 포함하므로 정확히 일치시킨다.
  await expect(page.getByRole("link", { name: "로그인", exact: true })).toBeVisible();

  await page.goto("/auth/login");
  await page.getByRole("textbox", { name: "이메일" }).fill(email);
  await page.getByRole("textbox", { name: "비밀번호" }).fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "로그인" }).click();

  await page.waitForURL("**/my");
  await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
});
