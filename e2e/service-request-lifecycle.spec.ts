import { test, expect } from "./test-base";
import { PrismaClient } from "@prisma/client";
import {
  login,
  logout,
  createProject,
  requestMovingService,
  assignPartnerViaAdmin,
  acceptAndQuoteAsPartner,
  advancePartnerRequestStatus,
} from "./helpers";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PARTNER_NAME, E2E_PARTNER_OWNER } from "./fixtures";

test("고객 신청부터 업체 작업 완료·고객 확인까지 전체 흐름이 끊기지 않는다", async ({ page }) => {
  const projectName = `E2E전체흐름-${Date.now()}`;

  // 1~3: 고객 로그인 → 프로젝트 생성 → 서비스 신청
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동");

  // 4: 고객이 마이페이지에서 접수 상태를 확인한다. 여러 요청 카드가 섞여
  // 있을 수 있어(공유 E2E 계정) 이 프로젝트명을 포함한 카드로 좁힌다.
  await page.goto("/my");
  const myCard = page.locator(".rounded-\\[24px\\]").filter({ hasText: projectName });
  await expect(myCard.getByText("신규", { exact: true })).toBeVisible();
  await logout(page);

  // 5~7: 관리자 로그인 → 신청 검색 → 승인된 업체 배정
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);
  await logout(page);

  // 8~12: 업체 로그인 → 배정 요청 확인 → 수락 → 견적 등록 → 견적 전달 상태 변경
  await login(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
  await acceptAndQuoteAsPartner(page, projectName, "기본형 이사 견적", 350000);
  await logout(page);

  // 13~15: 고객 로그인 → 견적 확인 → 견적 선택
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/projects/${projectId}/services`);
  await expect(page.getByText("받은 견적 1건")).toBeVisible();
  await expect(page.getByText("기본형 이사 견적 · 350,000원")).toBeVisible();
  await page.getByRole("button", { name: "이 견적 선택" }).click();
  await expect(page.getByText("선택한 견적")).toBeVisible();
  await logout(page);

  // 16~20: 업체 로그인 → 고객 선택 확인 → 작업 예정 → 작업 중 → 작업 완료
  await login(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
  await page.goto("/partner");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("검색 결과 1건")).toBeVisible();
  await page.getByRole("link", { name: "상세보기 →" }).click();
  await expect(page.getByText("견적 선택")).toBeVisible();

  await advancePartnerRequestStatus(page, "작업 예정");
  await advancePartnerRequestStatus(page, "작업 중");
  await advancePartnerRequestStatus(page, "작업 완료");
  await logout(page);

  // 21~22: 고객 로그인 → 작업 완료 상태와 공개 활동 이력 확인
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/projects/${projectId}/services`);
  await expect(page.getByText("작업 완료", { exact: true })).toBeVisible();
  await expect(page.getByText("서비스가 완료되었습니다.")).toBeVisible();
  await expect(page.getByText("최근 진행")).toBeVisible();
  // 종료 상태에서는 취소 버튼이 보이지 않아야 한다.
  await expect(page.getByRole("button", { name: "신청 취소" })).toHaveCount(0);
});

test("고객이 업체 배정 전 서비스 신청을 직접 취소할 수 있다", async ({ page }) => {
  const projectName = `E2E취소전-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동");

  await page.goto(`/projects/${projectId}/services`);
  await page.getByRole("button", { name: "신청 취소" }).click();
  await page.getByRole("button", { name: "취소 확정" }).click();

  // 인라인 확인 문구와 상태 배지의 "다음 행동" 안내 문구가 같은 문장이라
  // 새로고침 후에는 두 곳에 다 나타날 수 있어 first()로 좁힌다.
  await expect(page.getByText("신청이 취소되었습니다.").first()).toBeVisible();
  await page.reload();
  await expect(page.getByText("취소", { exact: true }).first()).toBeVisible();
});

test("고객이 업체 배정 후에는 취소 요청으로 전환되고 관리자·업체에 표시된다", async ({ page }) => {
  const projectName = `E2E취소요청-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동");
  await logout(page);

  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);
  await logout(page);

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/projects/${projectId}/services`);
  await page.getByRole("button", { name: "신청 취소" }).click();
  await page.getByLabel(/취소 사유/).fill("일정이 바뀌었습니다.");
  await page.getByRole("button", { name: "취소 확정" }).click();
  await expect(page.getByText("취소 요청을 보냈습니다.")).toBeVisible();
  await logout(page);

  // 관리자 화면에 취소 요청 배지·사유가 보인다. MetricGrid에도 "취소 요청"
  // 라벨이 항상 떠 있어 이 프로젝트 카드로 정확히 좁혀서 확인한다.
  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto("/admin/service-leads");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();
  const adminCard = page.locator(".rounded-\\[24px\\]").filter({ hasText: projectName });
  await expect(adminCard.getByText("취소 요청", { exact: true })).toBeVisible();
  await expect(adminCard.getByText("일정이 바뀌었습니다.")).toBeVisible();
  await logout(page);

  // 업체 화면에서도 상태 변경으로 취소 요청을 처리(취소 확정)할 수 있다.
  await login(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
  await page.goto("/partner");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("검색 결과 1건")).toBeVisible();
  await page.getByRole("link", { name: "상세보기 →" }).click();
  await page.waitForURL(/\/partner\/requests\//);
  await expect(page.getByText("현재 상태:")).toBeVisible();

  // 현재 상태가 "신규"라 "요청 거절" 버튼으로 곧바로 취소 상태를 선택할 수
  // 있다 — select 드롭다운 조작보다 실제 업체가 쓰는 경로에 더 가깝다.
  const statusForm = page.locator("form").filter({ hasText: "다음 상태" }).filter({ hasText: "상태 저장" });
  await page.getByRole("button", { name: "요청 거절" }).click();
  await statusForm.getByLabel(/거절\/취소 사유/).fill("고객 요청으로 취소");
  await statusForm.getByRole("button", { name: "상태 저장" }).click();
  await expect(page.getByText("현재 상태:")).toContainText("취소");
});

test("검토 대기·서비스 유형이 다른 업체는 관리자 배정 후보에 나타나지 않는다", async ({ page }) => {
  const projectName = `E2E검증게이트-${Date.now()}`;
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });

  let pendingPartnerName: string;
  let mismatchedPartnerName: string;
  try {
    const pending = await prisma.partner.create({
      data: {
        name: `E2E검토대기업체-${Date.now()}`,
        serviceType: "이사",
        partnerCode: `E2EPEND${Date.now()}`,
        verificationStatus: "PENDING",
      },
    });
    pendingPartnerName = pending.name;

    const mismatched = await prisma.partner.create({
      data: {
        name: `E2E타입불일치업체-${Date.now()}`,
        serviceType: "입주청소",
        partnerCode: `E2EMISM${Date.now()}`,
        verificationStatus: "APPROVED",
      },
    });
    mismatchedPartnerName = mismatched.name;
  } finally {
    await prisma.$disconnect();
  }

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동");
  await logout(page);

  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto("/admin/service-leads");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("검색 결과 1건")).toBeVisible();

  const options = await page.getByLabel("담당 업체 배정").locator("option").allTextContents();
  expect(options).toContain(E2E_PARTNER_NAME);
  expect(options).not.toContain(pendingPartnerName);
  expect(options).not.toContain(mismatchedPartnerName);
});

test("업체를 찾지 못하면 관리자가 안내를 보내고 고객은 내부 사유 없이 안내만 본다", async ({ page }) => {
  const projectName = `E2E연결어려움-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동");
  await logout(page);

  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await page.goto("/admin/service-leads");
  await page.getByRole("textbox", { name: /검색/ }).fill(projectName);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("검색 결과 1건")).toBeVisible();
  const adminCard = page.locator(".rounded-\\[24px\\]").filter({ hasText: projectName });
  await adminCard.getByRole("button", { name: "연결 어려움 안내 보내기" }).click();
  await adminCard
    .getByLabel(/내부 사유/)
    .fill("해당 지역에 취급 업체가 없습니다 — 내부용 메모");
  // 발송 전 window.confirm()으로 한 번 더 확인시킨다 — 실제 고객에게 메일이
  // 나가는 동작이라 다른 상태 변경 폼들과 같은 확인 패턴을 쓴다.
  page.once("dialog", (dialog) => dialog.accept());
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes("/no-partner-notice") && res.request().method() === "POST",
    ),
    adminCard.getByRole("button", { name: "안내 발송" }).click(),
  ]);
  await expect(adminCard.getByText("연결 어려움 안내 완료")).toBeVisible();
  await logout(page);

  // 고객 화면에는 관리자의 내부 사유가 절대 노출되지 않고, 고정된 안전한
  // 안내 문구만 보인다.
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto(`/projects/${projectId}/services`);
  await expect(page.getByText("연결 확인 중")).toBeVisible();
  await expect(
    page.getByText("업체 연결이 지연되고 있어 계속 확인 중입니다"),
  ).toBeVisible();
  await expect(page.getByText(/내부용 메모/)).toHaveCount(0);
});
