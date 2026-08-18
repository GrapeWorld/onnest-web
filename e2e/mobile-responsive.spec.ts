import { test, expect } from "./test-base";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PARTNER_OWNER } from "./fixtures";
import {
  loginViaSession,
  login,
  createProject,
  expectNoHorizontalOverflow,
  expectControlsWithinViewport,
} from "./helpers";

/**
 * ONNEST 전체 화면의 모바일 반응형 회귀를 넓게 훑는다. 개별 화면의 세부
 * 레이아웃 버그는 각 기능의 전용 spec(auth-form-layout.spec.ts 등)에서
 * 잡고, 여기서는 "공통 원인(grid/flex min-w-0, 표 스크롤, 긴 텍스트 줄바꿈)"
 * 이 화면 전반에 실제로 적용됐는지 넓고 얕게 확인한다.
 */
const MOBILE_WIDTHS = [320, 390];

async function checkPage(page: import("./test-base").Page, label: string) {
  await expectNoHorizontalOverflow(page, label);
  await expectControlsWithinViewport(page);
}

test.describe("비로그인 화면", () => {
  for (const width of MOBILE_WIDTHS) {
    test(`${width}px 홈 화면은 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await checkPage(page, `${width}px 홈`);
    });
  }
});

test.describe("마이페이지·문의", () => {
  for (const width of MOBILE_WIDTHS) {
    test(`${width}px 마이페이지는 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await loginViaSession(page, E2E_CUSTOMER.email);
      await page.goto("/my");
      await checkPage(page, `${width}px 마이페이지`);
    });

    test(`${width}px 내 문의 목록은 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await loginViaSession(page, E2E_CUSTOMER.email);
      await page.goto("/my/inquiries");
      await checkPage(page, `${width}px 내 문의`);
    });
  }
});

test.describe("프로젝트 생성 위저드", () => {
  for (const width of MOBILE_WIDTHS) {
    test(`${width}px 프로젝트 생성 1단계는 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await loginViaSession(page, E2E_CUSTOMER.email);
      await page.goto("/projects/new");
      await checkPage(page, `${width}px 프로젝트 생성`);
    });
  }
});

test.describe("문의 작성(비로그인 공개 폼)", () => {
  for (const width of MOBILE_WIDTHS) {
    test(`${width}px 문의 작성 화면은 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/contact");
      await checkPage(page, `${width}px 문의 작성`);
    });
  }
});

test.describe("업체 포털", () => {
  for (const width of MOBILE_WIDTHS) {
    test(`${width}px 업체 포털 요청 목록은 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await loginViaSession(page, E2E_PARTNER_OWNER.email);
      await page.goto("/partner");
      await checkPage(page, `${width}px 업체 포털`);
    });

    test(`${width}px 업체 정보 화면은 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await loginViaSession(page, E2E_PARTNER_OWNER.email);
      await page.goto("/partner/company");
      await checkPage(page, `${width}px 업체 정보`);
    });

    test(`${width}px 업체 팀 관리 화면은 가로 오버플로가 없다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await loginViaSession(page, E2E_PARTNER_OWNER.email);
      await page.goto("/partner/team");
      await checkPage(page, `${width}px 업체 팀 관리`);
    });
  }
});

test.describe("관리자 화면", () => {
  const adminRoutes: [string, string][] = [
    ["/admin", "관리자 대시보드"],
    ["/admin/users", "관리자 회원 관리"],
    ["/admin/inquiries", "관리자 문의 관리"],
    ["/admin/partners", "관리자 업체 관리"],
    ["/admin/service-leads", "관리자 서비스 신청 관리"],
    ["/admin/handovers", "관리자 생활 정보 검수"],
  ];

  for (const width of MOBILE_WIDTHS) {
    for (const [path, label] of adminRoutes) {
      test(`${width}px ${label}는 가로 오버플로가 없다`, async ({ page }) => {
        await page.setViewportSize({ width, height: 844 });
        await loginViaSession(page, E2E_ADMIN.email);
        await page.goto(path);
        await checkPage(page, `${width}px ${label}`);
      });
    }
  }
});

test.describe("긴 텍스트(프로젝트명)가 레이아웃을 깨지 않는다", () => {
  test("아주 긴 프로젝트 이름을 만들어도 위저드 요약·마이페이지·프로젝트 상세가 카드 밖으로 넘치지 않는다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

    const longName =
      "서울특별시강남구테헤란로매우매우매우매우매우매우매우매우긴프로젝트이름테스트-" + Date.now();
    const projectId = await createProject(page, longName);

    // 위저드 3단계 요약 카드는 생성 직후 프로젝트 상세로 넘어가므로,
    // 상세 화면과 마이페이지에서 긴 이름이 카드를 넘치지 않는지 확인한다.
    await checkPage(page, "390px 긴 프로젝트명 - 프로젝트 상세");
    await expect(page.getByRole("heading", { name: longName })).toBeVisible();

    await page.goto("/my");
    await checkPage(page, "390px 긴 프로젝트명 - 마이페이지");

    expect(projectId).toBeTruthy();
  });
});

test.describe("모바일 내비게이션 동작", () => {
  test("햄버거 메뉴를 열고, 링크로 이동하고, 다시 닫힌 상태로 시작한다", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const menuButton = page.getByRole("button", { name: "메뉴 열기" });
    await expect(menuButton).toBeVisible();
    await expect(page.getByRole("navigation").getByRole("link", { name: "서비스 소개" })).toBeHidden();

    await menuButton.click();
    await expect(page.getByRole("button", { name: "메뉴 닫기" })).toBeVisible();
    const serviceLink = page.getByRole("link", { name: "서비스 소개" });
    await expect(serviceLink).toBeVisible();

    await serviceLink.click();
    await page.waitForURL("**/service");

    // 새 페이지에서는 메뉴가 다시 닫힌 상태로 시작해야 한다.
    await expect(page.getByRole("button", { name: "메뉴 열기" })).toBeVisible();
  });
});
