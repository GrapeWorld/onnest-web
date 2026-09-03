import { test, expect } from "./test-base";
import type { Page } from "./test-base";
import { PrismaClient } from "@prisma/client";
import { login, loginViaSession, createProject } from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN, E2E_PARTNER_OWNER } from "./fixtures";

function uniqueNaverListingUrl() {
  return `https://fin.land.naver.com/complexes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

async function switchUser(page: Page, email: string, password: string) {
  await page.context().clearCookies();
  await login(page, email, password);
}

async function createIsolatedCustomer(prefix: string) {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    const email = `e2e.${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@onnesthome.com`;
    const user = await prisma.user.create({ data: { email, name: prefix, termsAgreedAt: new Date() } });
    return { id: user.id, email };
  } finally {
    await prisma.$disconnect();
  }
}

test("관리자가 공유한 매물을 고객이 저장하면 상세 화면에 관리자 공유 정보가 보이고, 그 매물로 프로젝트를 만들 수 있다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("link-shared");
  const projectName = `E2E공유연결-${Date.now()}`;
  const suggestionTitle = `E2E공유연결매물-${Date.now()}`;

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(suggestionTitle);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill("서울특별시 마포구 상암동 1");
  await page.getByRole("textbox", { name: "고객에게 공유할 이유" }).fill("희망 지역과 예산 범위 안에 있는 매물입니다.");
  await page.getByRole("textbox", { name: "고객이 추가로 확인해야 할 점", exact: false }).fill("실제 입주 가능일은 별도 확인이 필요합니다.");
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(`/api/admin/projects/${projectId}/property-suggestions`) && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "고객에게 공유하기" }).click(),
  ]);

  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("link", { name: "내 매물 후보에 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/new\?fromSuggestion=/);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  // 관리자가 남긴 공유 이유·확인 필요 문구가 상세 화면에 보인다(관리자 내부
  // 메모는 애초에 고객 대상 select에 없어 노출될 수 없다).
  await expect(page.getByRole("heading", { name: "관리자 공유 정보" })).toBeVisible();
  await expect(page.getByText("희망 지역과 예산 범위 안에 있는 매물입니다.")).toBeVisible();
  await expect(page.getByText("실제 입주 가능일은 별도 확인이 필요합니다.")).toBeVisible();

  // 최종 후보로 정해 기존 프로젝트 생성 위저드로 이어간다.
  await page.getByRole("button", { name: "이 매물로 프로젝트 만들기" }).click();
  await page.waitForURL("**/projects/new");
  await expect(page.getByRole("textbox", { name: "도로명 주소" })).toHaveValue("서울특별시 마포구 상암동 1");

  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "방문 예정" }).click();
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();

  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  await expect(page.getByText(`이 프로젝트는 매물 후보 "${suggestionTitle}"에서 시작되었습니다.`)).toBeVisible();
});

test("프로젝트 생성 위저드에서 전달된 주소를 고객이 확인하고 수정할 수 있다", async ({ page }) => {
  const customer = await createIsolatedCustomer("link-edit");
  await loginViaSession(page, customer.email);
  const title = `E2E주소수정-${Date.now()}`;
  const originalAddress = "서울특별시 강남구 역삼동 1";
  const editedAddress = "서울특별시 서초구 서초동 999";

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill(originalAddress);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.getByRole("button", { name: "이 매물로 프로젝트 만들기" }).click();
  await page.waitForURL("**/projects/new");
  const addressBox = page.getByRole("textbox", { name: "도로명 주소" });
  await expect(addressBox).toHaveValue(originalAddress);
  await addressBox.fill(editedAddress);

  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "방문 예정" }).click();
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();

  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  await expect(page.getByText(editedAddress)).toBeVisible();
  await expect(page.getByText(originalAddress)).toHaveCount(0);
});

test("다른 고객의 매물 후보 id를 프로젝트 생성 API에 보내도 연결되지 않는다", async ({ page }) => {
  const attacker = await createIsolatedCustomer("link-attacker");
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  let victimCandidateId: string;
  try {
    const victim = await prisma.user.create({
      data: { email: `e2e.link-victim-${Date.now()}@onnesthome.com`, name: "피해자" },
    });
    const candidate = await prisma.candidateProperty.create({
      data: { userId: victim.id, sourceUrl: uniqueNaverListingUrl(), title: "타인 매물" },
    });
    victimCandidateId = candidate.id;
  } finally {
    await prisma.$disconnect();
  }

  await loginViaSession(page, attacker.email);
  const res = await page.request.post("/api/projects", {
    data: {
      name: "가로채기 시도 프로젝트",
      spaceCategory: "residential",
      spaceSubtype: "apartment",
      transactionType: "jeonse",
      addressPending: true,
      scheduleUndecided: true,
      projectStage: "visit_planned",
      sourceCandidatePropertyId: victimCandidateId,
    },
  });
  // 연결 실패는 프로젝트 생성 자체를 막는다(트랜잭션 전체 롤백) — 소유자가
  // 아닌지, 존재하지 않는지 구분되는 정보를 주지 않는 일반 오류다.
  expect(res.status()).toBe(409);

  const verifyPrisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    const candidate = await verifyPrisma.candidateProperty.findUnique({ where: { id: victimCandidateId } });
    expect(candidate?.linkedProjectId).toBeNull();
    expect(candidate?.status).toBe("관심");

    const attackerUser = await verifyPrisma.user.findUniqueOrThrow({ where: { email: attacker.email } });
    const attackerProjectCount = await verifyPrisma.project.count({ where: { userId: attackerUser.id } });
    expect(attackerProjectCount).toBe(0);
  } finally {
    await verifyPrisma.$disconnect();
  }
});

test("이미 프로젝트에 연결된 매물은 다시 연결되지 않고, 상세 화면에서 프로젝트 만들기 버튼이 사라진다", async ({
  page,
}) => {
  const customer = await createIsolatedCustomer("link-duplicate");
  await loginViaSession(page, customer.email);
  const title = `E2E중복연결-${Date.now()}`;

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  const candidateId = page.url().match(/\/my\/candidate-properties\/([a-z0-9]+)$/)?.[1] as string;

  await page.getByRole("button", { name: "이 매물로 프로젝트 만들기" }).click();
  await page.waitForURL("**/projects/new");
  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.getByRole("checkbox", { name: "아직 주소를 정하지 않았어요" }).check();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "방문 예정" }).click();
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();
  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  const firstProjectId = page.url().match(/\/projects\/([a-z0-9]+)$/)?.[1];

  // UI: 이미 연결된 매물 상세에는 "이 매물로 프로젝트 만들기" 버튼이 없다.
  await page.goto(`/my/candidate-properties/${candidateId}`);
  await expect(page.getByRole("button", { name: "이 매물로 프로젝트 만들기" })).toHaveCount(0);
  await expect(page.getByText("이 매물은 이미 프로젝트로 연결되어 있습니다.")).toBeVisible();

  // 서버: 위조된 두 번째 요청을 직접 보내면 프로젝트 생성 자체가
  // 거절된다(두 번째 프로젝트가 아예 만들어지지 않는다).
  const res = await page.request.post("/api/projects", {
    data: {
      name: "중복 연결 시도 프로젝트",
      spaceCategory: "residential",
      spaceSubtype: "apartment",
      transactionType: "jeonse",
      addressPending: true,
      scheduleUndecided: true,
      projectStage: "visit_planned",
      sourceCandidatePropertyId: candidateId,
    },
  });
  expect(res.status()).toBe(409);

  const verifyPrisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    const candidate = await verifyPrisma.candidateProperty.findUnique({ where: { id: candidateId } });
    expect(candidate?.linkedProjectId).toBe(firstProjectId);

    const projectUser = await verifyPrisma.user.findUniqueOrThrow({ where: { email: customer.email } });
    const projectCount = await verifyPrisma.project.count({ where: { userId: projectUser.id } });
    expect(projectCount).toBe(1);
  } finally {
    await verifyPrisma.$disconnect();
  }
});

test("프로젝트 생성이 서버에서 실패해도 연결하려던 매물 후보는 그대로 남는다", async ({ page }) => {
  const customer = await createIsolatedCustomer("link-failure");
  await loginViaSession(page, customer.email);
  const title = `E2E생성실패-${Date.now()}`;

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  const candidateId = page.url().match(/\/my\/candidate-properties\/([a-z0-9]+)$/)?.[1] as string;

  // 위저드 자체 클라이언트 검증을 우회해, 서버 스키마 검증에서 걸리는
  // 요청(필수값 누락)을 직접 보낸다.
  const res = await page.request.post("/api/projects", {
    data: { sourceCandidatePropertyId: candidateId },
  });
  expect(res.status()).toBe(400);

  const verifyPrisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    const candidate = await verifyPrisma.candidateProperty.findUnique({ where: { id: candidateId } });
    expect(candidate).not.toBeNull();
    expect(candidate?.title).toBe(title);
    expect(candidate?.linkedProjectId).toBeNull();
  } finally {
    await verifyPrisma.$disconnect();
  }

  // 화면에서도 매물 후보가 그대로(연결 전 상태로) 보인다.
  await page.goto(`/my/candidate-properties/${candidateId}`);
  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.getByRole("button", { name: "이 매물로 프로젝트 만들기" })).toBeVisible();
});

test("업체 계정은 연결되지 않은 매물 후보 상세 화면에 접근할 수 없다", async ({ page }) => {
  const customer = await createIsolatedCustomer("link-partner-block");
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  let candidateId: string;
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { email: customer.email } });
    const candidate = await prisma.candidateProperty.create({
      data: { userId: user.id, sourceUrl: uniqueNaverListingUrl(), title: "업체 접근 차단 확인용" },
    });
    candidateId = candidate.id;
  } finally {
    await prisma.$disconnect();
  }

  await switchUser(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
  await page.goto(`/my/candidate-properties/${candidateId}`);
  await expect(page.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();

  const patchResponse = await page.request.patch(`/api/my/candidate-properties/${candidateId}`, {
    data: { title: "업체가 가로챈 제목" },
  });
  expect(patchResponse.status()).toBe(404);
});

test("프로젝트 위저드에 연결 대상 매물명이 표시되고, '매물 연결 해제'로 연결 없이 진행할 수 있다", async ({ page }) => {
  const customer = await createIsolatedCustomer("link-wizard-ui");
  await loginViaSession(page, customer.email);
  const title = `E2E위저드표시-${Date.now()}`;
  const address = "서울특별시 종로구 1";

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill(address);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await page.getByRole("button", { name: "이 매물로 프로젝트 만들기" }).click();
  await page.waitForURL("**/projects/new");

  // 매물명이 안내로 표시되고, 프리필된 주소도 그대로 보인다.
  await expect(page.getByText(title, { exact: false })).toBeVisible();
  const addressBox = page.getByRole("textbox", { name: "도로명 주소" });
  await expect(addressBox).toHaveValue(address);

  // 연결 해제 — 안내가 사라지고 초안 값(주소)은 그대로 유지된다.
  await page.getByRole("button", { name: "매물 연결 해제" }).click();
  await expect(page.getByRole("button", { name: "매물 연결 해제" })).toHaveCount(0);
  await expect(addressBox).toHaveValue(address);

  // 이대로 프로젝트를 만들면 정상 생성되지만 매물과는 연결되지 않는다.
  await page.getByRole("button", { name: /^주거/ }).click();
  await page.getByRole("button", { name: "아파트", exact: true }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "전세" }).click();
  await page.getByRole("button", { name: "다음" }).click();
  await page.getByRole("button", { name: "방문 예정" }).click();
  await page.getByRole("button", { name: "프로젝트 만들기" }).click();
  await page.waitForURL((url) => /\/projects\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));
  await expect(page.getByText("이 프로젝트는 매물 후보", { exact: false })).toHaveCount(0);
});

test("고객이 장점을 수정하면 상세 화면에 관리자가 남긴 공유 이유 원문이 따로 표시된다", async ({ page }) => {
  const customer = await createIsolatedCustomer("link-origin-edited");
  const projectName = `E2E원문표시-${Date.now()}`;
  const suggestionTitle = `E2E원문표시매물-${Date.now()}`;
  const originalReason = "희망 지역과 예산 범위 안에 있는 매물입니다.";

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(suggestionTitle);
  await page.getByRole("textbox", { name: "고객에게 공유할 이유" }).fill(originalReason);
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(`/api/admin/projects/${projectId}/property-suggestions`) && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "고객에게 공유하기" }).click(),
  ]);

  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("link", { name: "내 매물 후보에 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/new\?fromSuggestion=/);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  // 저장 직후에는 원문과 장점이 같아 중복 노출 없이 반영 안내만 보인다.
  await expect(page.getByText("공유 당시 남긴 이유·확인 필요 사항은 위", { exact: false })).toBeVisible();

  // 장점을 직접 고친다.
  await page.getByRole("link", { name: "정보 수정" }).click();
  await page.getByRole("textbox", { name: "장점", exact: false }).fill("직접 확인해보니 채광이 좋았습니다.");
  await page.getByRole("button", { name: "수정 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await expect(page.getByText("관리자가 남긴 공유 이유(원문)")).toBeVisible();
  await expect(page.getByText(originalReason)).toBeVisible();
  await expect(page.getByText("공유 당시 남긴 이유·확인 필요 사항은 위", { exact: false })).toHaveCount(0);
});

test("관리자가 별도 설명 없이 매물만 공유하면 상세 화면에 정확한 빈 안내가 표시된다", async ({ page }) => {
  const customer = await createIsolatedCustomer("link-origin-empty");
  const projectName = `E2E빈안내-${Date.now()}`;
  const suggestionTitle = `E2E빈안내매물-${Date.now()}`;

  await loginViaSession(page, customer.email);
  const projectId = await createProject(page, projectName);

  await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto(`/admin/projects/${projectId}`);
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(suggestionTitle);
  // 공유 이유·확인 필요 사항은 비워둔다.
  await page.getByRole("button", { name: "공유 내용 확인" }).click();
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(`/api/admin/projects/${projectId}/property-suggestions`) && res.request().method() === "POST",
    ),
    page.getByRole("button", { name: "고객에게 공유하기" }).click(),
  ]);

  await page.context().clearCookies();
  await loginViaSession(page, customer.email);
  await page.goto(`/projects/${projectId}`);
  await page.getByRole("link", { name: "내 매물 후보에 저장" }).click();
  await page.waitForURL(/\/my\/candidate-properties\/new\?fromSuggestion=/);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  await expect(page.getByRole("heading", { name: "관리자 공유 정보" })).toBeVisible();
  await expect(
    page.getByText("관리자가 공유한 매물에서 저장했습니다. 별도로 전달된 설명은 없습니다."),
  ).toBeVisible();
});

test("매물 상세 화면은 지도 미설정 상태에서도 위치 안내와 핵심 기능이 정상 동작한다", async ({ page }) => {
  const customer = await createIsolatedCustomer("link-map-fallback");
  await loginViaSession(page, customer.email);
  const title = `E2E지도폴백-${Date.now()}`;
  const address = "서울특별시 종로구 세종대로 1";

  await page.goto("/my/candidate-properties/new");
  await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
  await page.getByRole("textbox", { name: "매물 이름 또는 별칭" }).fill(title);
  await page.getByRole("textbox", { name: "주소", exact: false }).fill(address);
  await page.getByRole("button", { name: "매물 후보 저장" }).click();
  await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

  // E2E 환경은 지도 API가 항상 미설정이다(playwright.config.ts) — 실패해도
  // 주소·핵심 CTA는 그대로 쓸 수 있어야 한다.
  await expect(page.getByText("지도를 사용할 수 없습니다. 주소 정보는 계속 확인할 수 있습니다.")).toBeVisible();
  await expect(page.getByText(address)).toBeVisible();
  await expect(page.getByRole("img", { name: /위치 지도/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "이 매물로 프로젝트 만들기" })).toBeVisible();
});

test.describe("매물 상세 화면 — 주요 viewport에서 가로 오버플로가 없다", () => {
  test("긴 관리자 공유 이유·확인 필요 문구·프로젝트명에서도 320~1366px에서 넘치지 않는다", async ({ page }) => {
    const customer = await createIsolatedCustomer("link-responsive");
    const longProjectName = "매우".repeat(50);
    const longReason = "이 매물을 공유하는 이유가 아주 길게 이어지는 경우를 확인합니다. ".repeat(8);
    const longCaution = "계약 전 별도로 확인이 필요한 사항이 아주 길게 이어지는 경우를 확인합니다. ".repeat(8);

    await loginViaSession(page, customer.email);
    const projectId = await createProject(page, longProjectName);

    await switchUser(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await page.goto(`/admin/projects/${projectId}`);
    await page.getByRole("textbox", { name: "원본 매물 URL" }).fill(uniqueNaverListingUrl());
    await page.getByRole("textbox", { name: "매물명 또는 별칭" }).fill(`E2E긴상세-${Date.now()}`);
    await page.getByRole("textbox", { name: "고객에게 공유할 이유" }).fill(longReason);
    await page.getByRole("textbox", { name: "고객이 추가로 확인해야 할 점", exact: false }).fill(longCaution);
    await page.getByRole("button", { name: "공유 내용 확인" }).click();
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/admin/projects/${projectId}/property-suggestions`) && res.request().method() === "POST",
      ),
      page.getByRole("button", { name: "고객에게 공유하기" }).click(),
    ]);

    await page.context().clearCookies();
    await loginViaSession(page, customer.email);
    await page.goto(`/projects/${projectId}`);
    await page.getByRole("link", { name: "내 매물 후보에 저장" }).click();
    await page.waitForURL(/\/my\/candidate-properties\/new\?fromSuggestion=/);
    await page.getByRole("button", { name: "매물 후보 저장" }).click();
    await page.waitForURL((url) => /\/my\/candidate-properties\/[a-z0-9]+$/.test(url.pathname) && !url.pathname.endsWith("/new"));

    await expect(page.getByRole("heading", { name: "관리자 공유 정보" })).toBeVisible();
    await checkWidths(page, [320, 390, 768, 1024, 1366]);
  });
});
