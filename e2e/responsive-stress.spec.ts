import { test, expect } from "./test-base";
import { PrismaClient } from "@prisma/client";
import {
  login,
  logout,
  createProject,
  requestMovingService,
  assignPartnerViaAdmin,
  expectNoHorizontalOverflow,
  expectControlsWithinViewport,
} from "./helpers";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PASSWORD } from "./fixtures";

/**
 * 극단적으로 긴 사용자 입력(이름 30자, 프로젝트명 100자, 긴 주소, 긴 이메일,
 * 공백 없는 긴 토큰, 2줄짜리 버튼 문구)을 넣어도 레이아웃이 깨지지 않는지
 * 확인한다. 실제 화면 흐름으로 재현 가능한 것은 UI를 그대로 거치고, 파일
 * 업로드처럼 이 테스트 환경에 스토리지가 없어 재현하기 어려운 것은
 * break-all/break-words가 실제로 걸려 있는 마크업에 긴 텍스트를 주입해
 * CSS 차원에서 넘치지 않는지 직접 검증한다.
 */
test("100자 프로젝트 이름 + 200자 긴 주소를 넣어도 위저드가 카드 밖으로 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

  await page.goto("/projects/new");
  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();

  const longAddress =
    "서울특별시강남구테헤란로매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우매우긴주소".slice(
      0,
      200,
    );
  await page.getByRole("textbox", { name: "도로명 주소" }).fill(longAddress);
  await page.getByRole("button", { name: "다음" }).click();
  await expectNoHorizontalOverflow(page, "390px 위저드 1→2단계 (긴 주소)");

  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByRole("button", { name: "방문 예정" }).click();
  const longName = ("스트레스테스트프로젝트이름".repeat(10)).slice(0, 100);
  expect(longName.length).toBe(100);
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill(longName);
  await expectNoHorizontalOverflow(page, "390px 위저드 3단계 요약 (100자 이름)");
  await expectControlsWithinViewport(page);

  await page.getByRole("button", { name: "프로젝트 만들기" }).click();
  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  await expectNoHorizontalOverflow(page, "390px 프로젝트 상세 (100자 이름 + 200자 주소)");
  await expect(page.getByRole("heading", { name: longName })).toBeVisible();

  await page.goto("/my");
  await expectNoHorizontalOverflow(page, "390px 마이페이지 (100자 이름 프로젝트 포함)");
});

test("30자 담당자 이름을 넣어도 서비스 신청 폼이 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);

  await page.goto("/projects/new");
  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.getByRole("checkbox", { name: "아직 주소를 정하지 않았어요" }).check();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "방문 예정" }).click();
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill(`E2E스트레스-${Date.now()}`);
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();
  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  const projectId = page.url().match(/\/projects\/([a-z0-9]+)$/)?.[1];
  await page.goto(`/projects/${projectId}/services`);

  await page.getByRole("checkbox", { name: "이사", exact: false }).click();
  const longRegion = "서울특별시강남구테헤란로매우긴지역명".repeat(3).slice(0, 100);
  await page.getByRole("textbox", { name: "지역" }).fill(longRegion);
  await page.getByRole("textbox", { name: "연락처" }).fill("010-9000-0002");
  await page.getByRole("checkbox", { name: /파트너 연결 목적/ }).check();
  await expectNoHorizontalOverflow(page, "320px 서비스 신청 폼 (긴 지역명)");
  await expectControlsWithinViewport(page);
});

test("긴 이메일로 회원가입해도 로그인 폼·마이페이지가 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const longLocalPart = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const longEmail = `${longLocalPart}@e2e-stress-test-onnesthome.com`;
  expect(longEmail.length).toBeGreaterThan(100);

  await page.goto("/auth/signup");
  await page.getByRole("textbox", { name: "이름" }).fill("E2E긴이메일테스트");
  await page.getByRole("textbox", { name: "이메일" }).fill(longEmail);
  await page.getByRole("textbox", { name: "휴대폰 번호" }).fill("010-9000-0099");
  await page.getByRole("textbox", { name: "비밀번호", exact: true }).fill(E2E_PASSWORD);
  await page.getByRole("textbox", { name: "비밀번호 확인" }).fill(E2E_PASSWORD);
  await page.getByRole("checkbox", { name: /이용약관/ }).check();
  await expectNoHorizontalOverflow(page, "320px 회원가입 폼 (100자+ 이메일)");

  await page.getByRole("button", { name: "회원가입" }).click();
  await page.waitForURL("**/my");
  await expectNoHorizontalOverflow(page, "320px 마이페이지 (긴 이메일 계정)");
});

test("공백 없는 200자 토큰과 2줄짜리 버튼 문구를 주입해도 카드 밖으로 넘치지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my");

  const overflowCount = await page.evaluate(() => {
    const card = document.querySelector("main .rounded-\\[24px\\], main .rounded-2xl");
    if (!card) return -1;

    const longToken = "a".repeat(200);
    const textEl = document.createElement("p");
    textEl.className = "break-all min-w-0";
    textEl.textContent = longToken;
    card.prepend(textEl);

    const btn = document.createElement("button");
    btn.className = "inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 text-sm font-semibold text-white";
    btn.textContent = "이것은 두 줄로 감싸져야 하는 아주 긴 버튼 문구 테스트입니다 두 번째 줄까지 이어집니다";
    btn.style.maxWidth = "280px";
    card.prepend(btn);

    const vw = document.documentElement.clientWidth;
    const textRect = textEl.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    let violations = 0;
    if (textRect.right > vw + 2) violations++;
    if (btnRect.right > vw + 2) violations++;
    return violations;
  });

  expect(overflowCount, "긴 토큰/2줄 버튼 주입 후 오버플로 발생").toBe(0);
  await expectNoHorizontalOverflow(page, "320px 마이페이지 (긴 토큰·2줄 버튼 주입)");
});

test("긴 업체명·프로젝트명·상태 문구가 모바일 서비스 신청 화면에서 넘치지 않는다", async ({ page }) => {
  const longPartnerName = "정말정말길고긴이름을가진이사전문파트너업체주식회사".repeat(2).slice(0, 60);
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    await prisma.partner.create({
      data: {
        name: longPartnerName,
        serviceType: "이사",
        partnerCode: `E2ELONGNAME${Date.now()}`,
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
      },
    });
  } finally {
    await prisma.$disconnect();
  }

  const longProjectName = "정말정말길고긴프로젝트이름테스트".repeat(3).slice(0, 60);

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, longProjectName);
  await requestMovingService(page, projectId, "남양주시 별내동");
  await logout(page);

  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await assignPartnerViaAdmin(page, longProjectName, longPartnerName);
  await logout(page);

  await page.setViewportSize({ width: 320, height: 844 });
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/projects/${projectId}/services`);

  await expect(page.getByText(longPartnerName)).toBeVisible();
  await expectNoHorizontalOverflow(page, "320px 서비스 신청 내역 (긴 업체명·프로젝트명)");
  await expectControlsWithinViewport(page);
});
