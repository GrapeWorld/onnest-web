import { expect, type Page } from "@playwright/test";
import { sealData } from "iron-session";
import { PrismaClient } from "@prisma/client";
import type { SessionData } from "../src/lib/session";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_SESSION_SECRET } from "./fixtures";

const BASE_URL = "http://localhost:3100";

/**
 * 방금 뜬 next dev(Turbopack) 서버로 보내는 첫 요청은 라우트 매니페스트가
 * 아직 안 갖춰져 드물게 404로 응답할 때가 있다(그 다음 요청부터는 정상).
 * 각 테스트의 첫 진입점인 로그인 페이지 이동에서만 짧게 재시도한다.
 */
async function gotoWithRetry(page: Page, url: string) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await page.goto(url);
    const notFound = await page
      .getByRole("heading", { name: "페이지를 찾을 수 없습니다" })
      .isVisible()
      .catch(() => false);
    if (!notFound) return;
    await page.waitForTimeout(500 * attempt);
  }
}

/** 버튼을 클릭하고 그 클릭이 유발한 API 응답을 기다린다 — 저장 완료 전에 다음 단계로 넘어가는 경합을 막는다. */
async function clickAndWaitForApi(
  page: Page,
  click: () => Promise<void>,
  urlIncludes: string,
  method: string,
) {
  const [response] = await Promise.all([
    page.waitForResponse((res) => res.url().includes(urlIncludes) && res.request().method() === method),
    click(),
  ]);
  if (!response.ok()) {
    throw new Error(`${method} ${urlIncludes} 실패: ${response.status()} ${await response.text()}`);
  }
  return response;
}

export async function login(page: Page, email: string, password: string) {
  await gotoWithRetry(page, "/auth/login");
  await page.getByRole("textbox", { name: "이메일" }).fill(email);
  await page.getByRole("textbox", { name: "비밀번호" }).fill(password);
  await page.getByRole("button", { name: "로그인" }).click();
  await page.waitForURL("**/my");
}

/**
 * /api/auth/login은 IP당 10회/10분으로 제한돼 있어, 로그인 폼 자체를
 * 검증하지 않는 테스트(내비게이션·리다이렉트 확인 등)에서까지 실제 로그인
 * 폼을 거치면 스위트 전체가 그 한도를 넘기 쉽다. 그런 테스트는 세션 쿠키를
 * 직접 발급해 "이미 로그인된 상태"만 만든다 — 로그인 폼 자체의 동작은
 * login()을 쓰는 기존 테스트들이 이미 검증한다.
 */
export async function loginViaSession(page: Page, email: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  let userId: string;
  let authVersion: number;
  try {
    const user = await prisma.user.findUniqueOrThrow({
      where: { email },
      select: { id: true, authVersion: true },
    });
    userId = user.id;
    authVersion = user.authVersion;
  } finally {
    await prisma.$disconnect();
  }

  const sessionData = { userId, authVersion } satisfies SessionData;
  const sealed = await sealData(sessionData, { password: E2E_SESSION_SECRET });
  await page.context().addCookies([
    {
      name: "onnest_session",
      value: sealed,
      url: BASE_URL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
}

/** 페이지 전체에 의도하지 않은 가로 스크롤이 없는지 확인한다. */
export async function expectNoHorizontalOverflow(page: Page, context = "") {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return doc.scrollWidth - doc.clientWidth;
  });
  expect(overflow, `${context} 가로 오버플로 발생 (scrollWidth - clientWidth = ${overflow})`).toBeLessThanOrEqual(0);
}

/** 폼 컨트롤·버튼의 bounding box가 뷰포트 폭을 넘지 않는지 확인한다. */
export async function expectControlsWithinViewport(page: Page) {
  const viewport = page.viewportSize();
  if (!viewport) return;
  const controls = page.locator("main input, main select, main textarea, main button, main a.inline-flex");
  const count = await controls.count();
  for (let i = 0; i < count; i++) {
    const box = await controls.nth(i).boundingBox();
    if (!box) continue;
    expect(box.x + box.width, "입력창/버튼이 뷰포트 오른쪽 경계를 벗어남").toBeLessThanOrEqual(viewport.width + 1);
  }
}

export async function logout(page: Page) {
  // /my 본문에도 같은 이름의 버튼이 있어 헤더로 스코프를 좁힌다.
  await page.getByRole("banner").getByRole("button", { name: "로그아웃" }).click();
  // 홈 히어로의 "기존 회원 로그인" 링크도 "로그인"을 부분 포함하므로 정확히 일치시킨다.
  await expect(page.getByRole("link", { name: "로그인", exact: true })).toBeVisible();
}

/** 새 입주 프로젝트 위저드를 끝까지 채우고 생성된 프로젝트 id를 반환한다. */
export async function createProject(page: Page, name: string): Promise<string> {
  await page.goto("/projects/new");

  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.getByRole("checkbox", { name: "아직 주소를 정하지 않았어요" }).check();
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();

  await page.getByRole("button", { name: "방문 예정" }).click();
  await page.getByRole("textbox", { name: "프로젝트 이름" }).fill(name);
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();

  // "/projects/new" 자체도 [a-z0-9]+에 걸리므로 new는 명시적으로 제외한다.
  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  const match = page.url().match(/\/projects\/([a-z0-9]+)$/);
  if (!match) throw new Error(`프로젝트 id를 URL에서 추출하지 못했습니다: ${page.url()}`);
  return match[1];
}

/** 프로젝트의 "서비스 연결" 화면에서 이사 서비스를 신청한다. */
export async function requestMovingService(page: Page, projectId: string, region: string) {
  await page.goto(`/projects/${projectId}/services`);

  await page.getByRole("checkbox", { name: "이사", exact: false }).click();
  await page.getByRole("textbox", { name: "지역" }).fill(region);
  await page.getByRole("textbox", { name: "연락처" }).fill("010-9000-0002");
  await page.getByRole("checkbox", { name: /파트너 연결 목적/ }).check();
  await page.getByRole("button", { name: /서비스 신청하기/ }).click();

  // 전체 스위트를 끝까지 순서대로 돌리면 마지막 몇 개 테스트에서 dev
  // 서버 응답이 느려지는 경우가 있어(장시간 순차 실행 특성) 기본
  // 타임아웃보다 여유를 둔다.
  await expect(page.getByText(/서비스 신청 1건이 접수되었습니다/)).toBeVisible({ timeout: 15_000 });
}

/** 관리자 서비스 리드 화면에서 프로젝트명으로 검색해 업체를 배정한다. */
export async function assignPartnerViaAdmin(page: Page, projectName: string, partnerName: string) {
  await page.goto("/admin/service-leads");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("검색 결과 1건")).toBeVisible();

  await page.getByLabel("담당 업체 배정").selectOption(partnerName);
  await clickAndWaitForApi(
    page,
    () => page.getByRole("button", { name: "저장" }).click(),
    "/api/admin/service-requests/",
    "PATCH",
  );
}

/** 업체 포털에서 프로젝트명으로 요청을 찾아 수락하고 견적을 등록한 뒤 "견적 전달"로 넘긴다. */
export async function acceptAndQuoteAsPartner(
  page: Page,
  projectName: string,
  quoteName: string,
  amount: number,
) {
  await page.goto("/partner");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("검색 결과 1건")).toBeVisible();
  await page.getByRole("link", { name: "상세보기 →" }).click();

  await clickAndWaitForApi(
    page,
    () => page.getByRole("button", { name: "요청 수락" }).click(),
    "/api/partner/service-requests/",
    "PATCH",
  );

  await page.getByRole("textbox", { name: "견적 이름 (예: 기본형)" }).fill(quoteName);
  await page.getByRole("spinbutton", { name: "금액 (원)" }).fill(String(amount));
  await clickAndWaitForApi(
    page,
    () => page.getByRole("button", { name: "견적 등록" }).click(),
    "/quotes",
    "POST",
  );

  const statusForm = page
    .locator("form")
    .filter({ hasText: "다음 상태" })
    .filter({ hasText: "상태 저장" });
  await statusForm.getByRole("combobox").selectOption("견적 전달");
  await clickAndWaitForApi(
    page,
    () => statusForm.getByRole("button", { name: "상태 저장" }).click(),
    "/api/partner/service-requests/",
    "PATCH",
  );
}

/**
 * 이미 업체 요청 상세 화면(/partner/requests/[id])에 있다고 가정하고, 다음
 * 상태로 한 단계 진행한다. acceptAndQuoteAsPartner 이후 이어서 쓴다.
 */
export async function advancePartnerRequestStatus(page: Page, nextStatus: string) {
  const statusForm = page
    .locator("form")
    .filter({ hasText: "다음 상태" })
    .filter({ hasText: "상태 저장" });
  await statusForm.getByRole("combobox").selectOption(nextStatus);
  await clickAndWaitForApi(
    page,
    () => statusForm.getByRole("button", { name: "상태 저장" }).click(),
    "/api/partner/service-requests/",
    "PATCH",
  );
}
