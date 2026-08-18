import { test } from "./test-base";
import { checkWidths } from "./responsive";
import { expectNoHorizontalOverflow } from "./helpers";
import { loginViaSession, login, createProject } from "./helpers";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PARTNER_OWNER } from "./fixtures";

/** 대표 휴대폰·태블릿 크기 + Tailwind 기본 breakpoint 경계값(±1px). */
const REPRESENTATIVE = [320, 375, 390, 430, 768, 1024, 1366];
const BOUNDARIES = [639, 640, 641, 767, 768, 769, 1023, 1024, 1025, 1279, 1280, 1281];
const CORE_WIDTHS = Array.from(new Set([...REPRESENTATIVE, ...BOUNDARIES])).sort((a, b) => a - b);

test.describe("로그인 후 핵심 페이지 — 대표 크기 + breakpoint 경계", () => {
  test("마이페이지", async ({ page }) => {
    await loginViaSession(page, E2E_CUSTOMER.email);
    await page.goto("/my");
    await checkWidths(page, CORE_WIDTHS);
  });

  test("프로젝트 생성 위저드", async ({ page }) => {
    await loginViaSession(page, E2E_CUSTOMER.email);
    await page.goto("/projects/new");
    await checkWidths(page, CORE_WIDTHS);
  });

  test("프로젝트 상세와 서비스 신청", async ({ page }) => {
    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
    const projectId = await createProject(page, `E2E경계값-${Date.now()}`);
    await page.goto(`/projects/${projectId}`);
    await checkWidths(page, CORE_WIDTHS);
    await page.goto(`/projects/${projectId}/services`);
    await checkWidths(page, CORE_WIDTHS);
  });
});

/** 표는 페이지 전체가 아니라 표 컨테이너 안에서만 가로 스크롤돼야 한다. */
async function expectTableScrollsWithinContainer(page: import("./test-base").Page, width: number) {
  await expectNoHorizontalOverflow(page, `${width}px`);
  const containerScrolls = await page.evaluate(() => {
    const containers = Array.from(document.querySelectorAll(".overflow-x-auto"));
    return containers.some((el) => el.scrollWidth > el.clientWidth + 1);
  });
  // 표가 뷰포트보다 넓을 때만(좁은 화면) 내부 스크롤이 실제로 걸려있는지 확인한다.
  if (width < 980) {
    if (!containerScrolls) {
      throw new Error(`${width}px: 표가 자체 컨테이너 안에서 가로 스크롤되지 않음 (overflow-x-auto 컨테이너를 못 찾았거나 스크롤이 걸리지 않음)`);
    }
  }
}

test.describe("업체·관리자 화면 — 대표 크기 (휴대폰 320·390 / 태블릿 768·1024 / 데스크톱 1366)", () => {
  const SIZES = [320, 390, 768, 1024, 1366];

  for (const width of SIZES) {
    test(`${width}px 관리자 회원 관리 — 표는 자체 컨테이너 안에서만 스크롤된다`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginViaSession(page, E2E_ADMIN.email);
      await page.goto("/admin/users");
      await expectTableScrollsWithinContainer(page, width);
    });

    test(`${width}px 업체 포털 요청 목록`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginViaSession(page, E2E_PARTNER_OWNER.email);
      await page.goto("/partner");
      await expectNoHorizontalOverflow(page, `${width}px 업체 포털`);
    });

    test(`${width}px 관리자 업체 관리`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await loginViaSession(page, E2E_ADMIN.email);
      await page.goto("/admin/partners");
      await expectNoHorizontalOverflow(page, `${width}px 관리자 업체 관리`);
    });
  }
});
