import { test, expect } from "./test-base";
import type { Page } from "./test-base";
import { PrismaClient } from "@prisma/client";
import { login, loginViaSession, createProject, expectNoHorizontalOverflow } from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN, E2E_CUSTOMER } from "./fixtures";

const NAVER_LISTING_URL = "https://fin.land.naver.com/complexes/98765";

/**
 * 이 스펙의 다른 테스트가 E2E_CUSTOMER 이름으로 NAVER_LISTING_URL을 이미
 * 매물 후보로 저장해 둔 채 끝나므로("매물 후보로 저장" 단계를 거치는
 * 테스트는), 같은 URL로 또 저장을 시도하면 새로 추가한 중복 URL 차단에
 * 걸린다 — 실제로 매물 후보 저장까지 이어지는 테스트에서는 매번 새 URL을 쓴다.
 */
function uniqueNaverListingUrl() {
  return `https://fin.land.naver.com/complexes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * 이미 로그인한 상태에서 /auth/login에 들어가면 /my로 바로 리다이렉트돼
 * 이메일 입력창이 나타나지 않는다 — 이 스펙은 한 테스트 안에서 고객·관리자·
 * 업체 계정을 번갈아 로그인하므로, 매번 쿠키를 지운 뒤 로그인한다.
 */
async function switchUser(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await login(page, email, password);
}

test("고객 프로젝트에 관리자가 매물을 공유하면 고객이 확인·응답하고 매물 후보로 저장해 기존 흐름으로 이어간다", async ({ page }) => {
  const projectName = `E2E거제이사-${Date.now()}`;
  const suggestionTitle = `E2E공유매물-${Date.now()}`;

  // 1~2. 고객이 프로젝트를 만들고 희망 조건을 저장한다.
  await switchUser(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);

  await page.goto("/my/candidate-properties");
  // 다른 스펙 파일이 먼저 실행돼 이 고객의 희망 조건(userId당 1개, 프로젝트별이
  // 아니다)이 이미 저장돼 있으면 버튼 문구가 "조건 수정"으로 바뀐다 — 실행
  // 순서와 무관하게 동작하도록 두 문구를 모두 허용한다.
  await page.getByRole("button", { name: /희망 조건 설정|조건 수정/ }).click();
  await page.getByRole("textbox", { name: "희망 지역", exact: false }).fill("경상남도 거제시");
  await page.getByRole("spinbutton", { name: "최대 예산(원)", exact: false }).fill("300000000");
  await page.getByRole("button", { name: "희망 조건 저장" }).click();
  await expect(page.getByText("희망 지역")).toBeVisible();

  // 3~5. 관리자가 프로젝트를 확인하고 매물을 직접 입력해 공유한다.
  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);
  await expect(page.getByText("경상남도 거제시")).toBeVisible(); // 희망 지역이 관리자 화면에 보인다

  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(NAVER_LISTING_URL);
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(suggestionTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("경상남도 거제시 아주동");
  await page.getByRole("textbox", { name: "고객에게 공유할 이유" }).fill("희망 지역과 예산 범위 안에 있는 매물입니다.");
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await page.getByRole("button", { name: "고객에게 공유하기" }).click();
  await expect(page.getByText(suggestionTitle).first()).toBeVisible();
  await expect(page.getByText("새로 공유됨")).toBeVisible();

  // 6~7. 고객 마이페이지·프로젝트 상세에서 새 공유 건을 확인하고, 원본 링크의 보안 속성을 확인한다.
  await switchUser(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/my");
  await expect(page.getByText("새로 공유된 매물 1건")).toBeVisible();

  await page.goto(`/projects/${projectId}`);
  await expect(page.getByRole("heading", { name: "프로젝트 맞춤 매물" })).toBeVisible();
  await expect(page.getByText(suggestionTitle)).toBeVisible();
  await expect(page.getByText("희망 지역과 예산 범위 안에 있는 매물입니다.")).toBeVisible();

  const externalLink = page.getByRole("link", { name: /외부 사이트에서 매물 확인/ });
  await expect(externalLink).toHaveAttribute("target", "_blank");
  await expect(externalLink).toHaveAttribute("rel", "noopener noreferrer");
  await expect(externalLink).toHaveAttribute("href", NAVER_LISTING_URL);

  // 재조회해도 고객이 직접 응답하기 전까지는 "새로 공유됨" 상태가 유지된다.
  await page.reload();
  await expect(page.getByText("새로 공유됨")).toBeVisible();

  // 8. 고객이 관심 있음으로 응답한다.
  await page.getByRole("button", { name: "관심 있어요" }).click();
  await expect(page.getByText("관심 있음")).toBeVisible();

  // 9. 내 매물 후보에 저장 — 기존 매물 등록 폼이 공유 정보로 미리 채워진다.
  await page.getByRole("link", { name: "내 매물 후보에 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/new\?fromSuggestion=/);
  await expect(page.getByRole("textbox", { name: "매물 이름 또는 별칭" })).toHaveValue(suggestionTitle);
  await expect(page.getByRole("textbox", { name: "원본 매물 URL" })).toHaveValue(NAVER_LISTING_URL);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);
  await expect(page.getByRole("heading", { name: suggestionTitle })).toBeVisible();

  // 다시 프로젝트로 가면 저장 완료 상태와 "저장한 매물 후보 보기" 링크로 바뀌어 있다.
  await page.goto(`/projects/${projectId}`);
  await expect(page.getByText("내 매물 후보에 저장함")).toBeVisible();
  await expect(page.getByRole("link", { name: "저장한 매물 후보 보기 →" })).toBeVisible();

  // 10~11. 기존 조건 비교·방문 체크리스트 화면이 그대로 동작한다(기존 흐름 재사용 확인).
  await page.getByRole("link", { name: "저장한 매물 후보 보기 →" }).click();
  await expect(page.getByRole("heading", { name: "희망 조건 비교" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "방문 확인 체크리스트" })).toBeVisible();
});

test("다른 고객의 프로젝트에 공유된 매물은 조회·응답할 수 없다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const otherEmail = `e2e.other-suggestion-${Date.now()}@onnesthome.com`;
  let suggestionId: string;
  let otherProjectId: string;

  try {
    const other = await prisma.user.create({ data: { email: otherEmail, name: "다른 고객" } });
    const admin = await prisma.user.findFirstOrThrow({ where: { email: E2E_ADMIN.email } });
    const project = await prisma.project.create({
      data: { userId: other.id, name: "다른고객프로젝트", spaceType: "아파트" },
    });
    otherProjectId = project.id;
    const suggestion = await prisma.projectPropertySuggestion.create({
      data: {
        projectId: project.id,
        sourceUrl: NAVER_LISTING_URL,
        title: "타인공유매물",
        sharedById: admin.id,
        sharedByName: admin.name,
        sharedByEmail: admin.email,
      },
    });
    suggestionId = suggestion.id;
  } finally {
    await prisma.$disconnect();
  }

  await loginViaSession(page, E2E_CUSTOMER.email);

  await page.goto(`/projects/${otherProjectId}`);
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();

  const listResponse = await page.request.get(`/api/my/projects/${otherProjectId}/property-suggestions`);
  const listData = await listResponse.json();
  expect(listData.items).toHaveLength(0);

  const getResponse = await page.request.get(`/api/my/property-suggestions/${suggestionId}`);
  expect(getResponse.status()).toBe(404);

  const patchResponse = await page.request.patch(`/api/my/property-suggestions/${suggestionId}/response`, {
    data: { customerStatus: "INTERESTED" },
  });
  expect(patchResponse.status()).toBe(404);
});

test("업체 계정은 공유 매물 관련 화면·API에 접근할 수 없다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  let projectId: string;
  try {
    const customer = await prisma.user.findFirstOrThrow({ where: { email: E2E_CUSTOMER.email } });
    const project = await prisma.project.create({
      data: { userId: customer.id, name: "업체차단테스트", spaceType: "아파트" },
    });
    projectId = project.id;
  } finally {
    await prisma.$disconnect();
  }

  await switchUser(page, "e2e.partner@onnesthome.com", "TestPass1234!");
  await page.goto(`/admin/projects/${projectId}`);
  // 관리자 레이아웃이 비관리자를 홈으로 돌려보낸다.
  await page.waitForURL((url) => url.pathname === "/");

  const response = await page.request.get(`/api/admin/projects/${projectId}/property-suggestions`);
  expect(response.status()).toBe(403);
});

test("조회전용 관리자는 매물을 공유·수정·철회할 수 없고 목록만 볼 수 있다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const viewerEmail = `e2e.viewer-admin-${Date.now()}@onnesthome.com`;
  let projectId: string;

  try {
    await prisma.user.create({ data: { email: viewerEmail, name: "조회전용관리자", adminRole: "viewer" } });
    const customer = await prisma.user.findFirstOrThrow({ where: { email: E2E_CUSTOMER.email } });
    const project = await prisma.project.create({
      data: { userId: customer.id, name: "뷰어차단테스트", spaceType: "아파트" },
    });
    projectId = project.id;
  } finally {
    await prisma.$disconnect();
  }

  await loginViaSession(page, viewerEmail);
  await page.goto(`/admin/projects/${projectId}`);
  await expect(page.getByText("조회전용 관리자는 매물을 공유할 수 없습니다.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "원본 매물 URL" })).toHaveCount(0);

  const response = await page.request.post(`/api/admin/projects/${projectId}/property-suggestions`, {
    data: { sourceUrl: NAVER_LISTING_URL, title: "차단되어야 함" },
  });
  expect(response.status()).toBe(403);
});

test("관리자는 같은 프로젝트에 같은 URL을 두 번 공유할 수 없고, 잘못된 URL 스킴은 거부된다", async ({ page }) => {
  await switchUser(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, `E2E중복공유-${Date.now()}`);

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);

  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(NAVER_LISTING_URL);
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill("첫 공유");
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await page.getByRole("button", { name: "고객에게 공유하기" }).click();
  await expect(page.getByText("첫 공유").first()).toBeVisible();

  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(NAVER_LISTING_URL);
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill("중복 시도");
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await page.getByRole("button", { name: "고객에게 공유하기" }).click();
  await expect(page.getByText("이미 이 프로젝트에 공유된 매물 URL입니다.")).toBeVisible();
  await expect(page.getByText("중복 시도")).toHaveCount(0);

  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill("javascript:alert(1)");
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill("악성 URL");
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await expect(page.getByText(/http 또는 https로 시작하는/)).toBeVisible();
});

test("이미 매물 후보로 저장된 공유 건은 다시 저장할 수 없다", async ({ page }) => {
  await switchUser(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, `E2E중복저장-${Date.now()}`);

  const listingUrl = uniqueNaverListingUrl();
  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(listingUrl);
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill("저장테스트매물");
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await page.getByRole("button", { name: "고객에게 공유하기" }).click();
  await expect(page.getByText("저장테스트매물").first()).toBeVisible();

  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  let suggestionId: string;
  try {
    const suggestion = await prisma.projectPropertySuggestion.findFirstOrThrow({
      where: { projectId, title: "저장테스트매물" },
    });
    suggestionId = suggestion.id;
  } finally {
    await prisma.$disconnect();
  }

  await switchUser(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/my/candidate-properties/new?fromSuggestion=${suggestionId}`);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/[a-z0-9]+$/);

  // 같은 공유 건을 다시 저장하려 하면(직접 API 호출) 차단된다.
  const response = await page.request.post("/api/my/candidate-properties", {
    data: { sourceUrl: `${listingUrl}?again=1`, title: "재저장 시도", suggestionId },
  });
  expect(response.status()).toBe(409);
});

test("320px~1366px에서 관리자 공유 화면과 고객 공유 매물 화면에 가로 오버플로가 없다", async ({ page }) => {
  await switchUser(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const longName = "아주 긴 프로젝트 이름".repeat(5);
  const projectId = await createProject(page, `${longName}-${Date.now()}`);

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(`${NAVER_LISTING_URL}?${"x".repeat(150)}`);
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill("아주 긴 매물 이름".repeat(5));
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("경상남도 거제시 장평동 아주 긴 주소 표기".repeat(3));
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await page.getByRole("button", { name: "고객에게 공유하기" }).click();

  await checkWidths(page, [320, 360, 390, 768, 1024, 1366]);

  await switchUser(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/projects/${projectId}`);
  await checkWidths(page, [320, 360, 390, 768, 1024, 1366]);
  await expectNoHorizontalOverflow(page, "프로젝트 상세(공유 매물 포함)");
});
