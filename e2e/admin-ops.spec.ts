import { test, expect } from "./test-base";
import { PrismaClient } from "@prisma/client";
import { login, loginViaSession } from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN } from "./fixtures";

async function switchUser(page: import("./test-base").Page, email: string, password: string) {
  await page.context().clearCookies();
  await login(page, email, password);
}

test("최고관리자가 조회전용 관리자를 지정·회수하고, 기존 세션은 회수 즉시 접근이 차단된다", async ({ page, browser }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const targetEmail = `e2e.viewer-target-${Date.now()}@onnesthome.com`;
  let targetId: string;
  try {
    const target = await prisma.user.create({ data: { email: targetEmail, name: "뷰어대상자" } });
    targetId = target.id;
  } finally {
    await prisma.$disconnect();
  }

  // 1. 최고관리자가 새 관리자(조회전용)를 지정한다.
  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/admins?q=${encodeURIComponent(targetEmail)}`);
  const candidateCard = page.locator(".rounded-\\[24px\\]").filter({ hasText: "뷰어대상자" });
  await candidateCard.getByPlaceholder("변경 사유 (필수)").fill("고객 문의 대응 지원");
  await candidateCard.getByRole("combobox").selectOption("viewer");
  await candidateCard.getByRole("button", { name: "변경 내용 확인" }).click();
  const [patchResponse] = await Promise.all([
    page.waitForResponse((res) => res.url().includes(`/api/admin/admins/${targetId}`) && res.request().method() === "PATCH"),
    page.getByRole("button", { name: "변경 확정" }).click(),
  ]);
  const patchBody = await patchResponse.json();
  expect(patchResponse.status()).toBe(200);
  expect(patchBody.adminRole).toBe("viewer");

  // 2. 별도 브라우저 컨텍스트(별도 쿠키)로 그 계정에 로그인해, 조회전용
  // 권한의 실제 접근 범위를 확인한다. "관리자 계정 관리"·"데이터 내보내기"는
  // requireSuperAdmin()이라 조회전용은 /admin으로 되돌아가고(차단이 아니라
  // 접근 범위 밖), 일반 관리자 화면(/admin)은 requireAdmin()만 요구해 정상
  // 접근된다 — 이 컨텍스트는 나중에 "회수 후 기존 세션 차단"을 검증하기
  // 위해 로그아웃하지 않고 그대로 둔다.
  const viewerContext = await browser.newContext();
  const viewerPage = await viewerContext.newPage();
  await loginViaSession(viewerPage, targetEmail);

  await viewerPage.goto("/admin/admins");
  await viewerPage.waitForURL((url) => url.pathname === "/admin");

  await viewerPage.goto("/admin/exports");
  await viewerPage.waitForURL((url) => url.pathname === "/admin");

  // 조회전용 관리자에게는 대시보드에 "데이터 내보내기"·"관리자 계정" 메뉴 자체가 보이지 않는다.
  await expect(viewerPage.getByRole("link", { name: "데이터 내보내기" })).toHaveCount(0);
  await expect(viewerPage.getByRole("link", { name: "관리자 계정" })).toHaveCount(0);

  // API로 직접 시도해도 403이다.
  const exportAttempt = await viewerPage.request.post("/api/admin/exports/customer-data", {
    data: { exportType: "CUSTOMER", customerId: targetId, sections: ["CUSTOMER_SUMMARY"], reason: "시도" },
  });
  expect(exportAttempt.status()).toBe(403);

  // 3. 최고관리자가 그 조회전용 권한을 완전히 회수한다.
  await page.goto(`/admin/admins?q=${encodeURIComponent(targetEmail)}`);
  const grantedCard = page.locator(".rounded-\\[24px\\]").filter({ hasText: "뷰어대상자" });
  await grantedCard.getByPlaceholder("변경 사유 (필수)").fill("지원 종료");
  await grantedCard.getByRole("combobox").selectOption("__revoke__");
  await grantedCard.getByRole("button", { name: "변경 내용 확인" }).click();
  await page.getByRole("button", { name: "변경 확정" }).click();

  // 4. 회수 이전에 발급된 viewer의 세션 쿠키를 그대로 다시 써도, 다음
  // 요청부터 관리자 화면(일반 /admin 포함) 접근이 즉시 막힌다 — 로그아웃도
  // authVersion 강제 증가도 없이, 매 요청 DB 재조회만으로 즉시 반영된다.
  await viewerPage.goto("/admin");
  await viewerPage.waitForURL((url) => url.pathname === "/");

  const blockedAttempt = await viewerPage.request.get("/api/admin/exports/history");
  expect(blockedAttempt.status()).toBe(403);

  await viewerContext.close();
});

test("최고관리자가 고객 데이터를 Excel로 내보내면 다운로드되고 이력이 남는다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const customerEmail = `e2e.export-target-${Date.now()}@onnesthome.com`;
  const customerName = `E2E내보내기고객${Date.now()}`;
  try {
    const customer = await prisma.user.create({ data: { email: customerEmail, name: customerName } });
    await prisma.project.create({
      data: { userId: customer.id, name: "E2E내보내기프로젝트", spaceType: "아파트", address: "서울시 강남구" },
    });
  } finally {
    await prisma.$disconnect();
  }

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/exports?q=${encodeURIComponent(customerEmail)}`);
  await expect(page.getByText(customerName)).toBeVisible();

  const customerCard = page.locator("li").filter({ hasText: "고객 전체 데이터" });
  await customerCard.getByRole("button", { name: "Excel 내보내기" }).click();
  await customerCard.getByPlaceholder(/고객 민원 대응/).fill("고객 문의 대응을 위한 이용 내역 확인");
  await customerCard.getByRole("button", { name: "내보내기 내용 확인" }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    customerCard.getByRole("button", { name: "Excel 생성" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(/^onnest-customer-data-\d{4}-\d{2}-\d{2}\.xlsx$/);
  expect(download.suggestedFilename()).not.toContain("@");

  await expect(customerCard.getByText(/파일을 생성했습니다/)).toBeVisible();

  await page.goto("/admin/exports/history");
  await expect(page.getByText("고객 문의 대응을 위한 이용 내역 확인")).toBeVisible();
  await expect(page.getByText("성공").first()).toBeVisible();
});

test("빈 프로젝트 고객도 Excel 생성이 실패하지 않는다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const customerEmail = `e2e.export-empty-${Date.now()}@onnesthome.com`;
  const customerName = `E2E빈고객${Date.now()}`;
  try {
    await prisma.user.create({ data: { email: customerEmail, name: customerName } });
  } finally {
    await prisma.$disconnect();
  }

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/exports?q=${encodeURIComponent(customerEmail)}`);
  const customerCard = page.locator("li").filter({ hasText: "고객 전체 데이터" });
  await customerCard.getByRole("button", { name: "Excel 내보내기" }).click();
  await customerCard.getByPlaceholder(/고객 민원 대응/).fill("빈 고객 확인");
  await customerCard.getByRole("button", { name: "내보내기 내용 확인" }).click();

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    customerCard.getByRole("button", { name: "Excel 생성" }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/\.xlsx$/);
});

test("일반 고객 계정은 관리자 API에 접근할 수 없다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const customerEmail = `e2e.plain-customer-${Date.now()}@onnesthome.com`;
  try {
    await prisma.user.create({ data: { email: customerEmail, name: "일반고객" } });
  } finally {
    await prisma.$disconnect();
  }

  await loginViaSession(page, customerEmail);
  await page.goto("/admin/exports");
  await page.waitForURL((url) => url.pathname === "/");

  const response = await page.request.post("/api/admin/exports/customer-data", {
    data: { exportType: "CUSTOMER", customerId: "any-id", sections: ["CUSTOMER_SUMMARY"], reason: "시도" },
  });
  expect(response.status()).toBe(403);

  const roleResponse = await page.request.patch("/api/admin/admins/any-id", {
    data: { toRole: "super", reason: "시도" },
  });
  expect(roleResponse.status()).toBe(403);
});

test("320px~1366px에서 관리자 관리·데이터 내보내기 화면에 가로 오버플로가 없다", async ({ page }) => {
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);

  await page.goto("/admin/admins");
  await checkWidths(page, [320, 360, 390, 768, 1024, 1366]);

  await page.goto("/admin/exports");
  await checkWidths(page, [320, 360, 390, 768, 1024, 1366]);
});
