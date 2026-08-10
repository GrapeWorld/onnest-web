import { test, expect } from "./test-base";
import { E2E_CUSTOMER, E2E_PARTNER_OWNER } from "./fixtures";
import { loginViaSession } from "./helpers";

test("비로그인 홈에서 '입주 준비 시작하기'를 누르면 회원가입으로 이동한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "입주 준비 시작하기" }).click();
  await page.waitForURL("**/auth/signup");
});

test("비로그인 홈에서 '기존 회원 로그인'을 누르면 로그인으로 이동한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "기존 회원 로그인" }).click();
  await page.waitForURL("**/auth/login");
});

test("로그인한 사용자가 로그인·회원가입 페이지에 접근하면 마이페이지로 보낸다", async ({ page }) => {
  await loginViaSession(page, E2E_CUSTOMER.email);

  await page.goto("/auth/login");
  await page.waitForURL("**/my");
  await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();

  await page.goto("/auth/signup");
  await page.waitForURL("**/my");
  await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
});

test("안전한 내부 returnTo는 로그인 폼 제출 후에도 그대로 유지된다", async ({ page }) => {
  await page.goto("/auth/login?returnTo=%2Fmy%2Finquiries");
  await page.getByRole("textbox", { name: "이메일" }).fill(E2E_CUSTOMER.email);
  await page.getByRole("textbox", { name: "비밀번호" }).fill(E2E_CUSTOMER.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/my/inquiries");
});

test("외부 returnTo는 로그인 폼 제출 시에도 차단되고 기본값(마이페이지)으로 보낸다", async ({ page }) => {
  await page.goto("/auth/login?returnTo=https%3A%2F%2Fevil.example.com");
  await page.getByRole("textbox", { name: "이메일" }).fill(E2E_CUSTOMER.email);
  await page.getByRole("textbox", { name: "비밀번호" }).fill(E2E_CUSTOMER.password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/my");
  await expect(page.getByRole("heading", { name: "마이페이지" })).toBeVisible();
});

test("모바일 화면에서 로그인 전에는 로그인·시작하기가, 로그인 후에는 마이페이지가 보인다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/");
  await expect(page.getByRole("banner").getByRole("link", { name: "로그인", exact: true })).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "시작하기", exact: true })).toBeVisible();

  await loginViaSession(page, E2E_CUSTOMER.email);
  await page.reload();

  await expect(page.getByRole("banner").getByRole("link", { name: "마이페이지" })).toBeVisible();
});

test("일반 고객 계정에는 마이페이지에 파트너 포털 링크가 보이지 않는다", async ({ page }) => {
  await loginViaSession(page, E2E_CUSTOMER.email);
  await page.goto("/my");
  await expect(page.getByRole("link", { name: "파트너 포털로 이동" })).toHaveCount(0);
});

test("업체 파트너 계정에는 마이페이지에 파트너 포털 링크가 보인다", async ({ page }) => {
  await loginViaSession(page, E2E_PARTNER_OWNER.email);
  await page.goto("/my");
  await expect(page.getByRole("link", { name: "파트너 포털로 이동" })).toBeVisible();
});
