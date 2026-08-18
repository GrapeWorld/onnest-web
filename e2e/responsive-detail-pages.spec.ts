import { test } from "./test-base";
import { checkWidths } from "./responsive";
import {
  login,
  logout,
  loginViaSession,
  createProject,
  requestMovingService,
  assignPartnerViaAdmin,
  acceptAndQuoteAsPartner,
} from "./helpers";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PARTNER_NAME, E2E_PARTNER_OWNER } from "./fixtures";

/**
 * 목록 화면 아래 한 단계 더 들어간 "상세" 화면들 — 프로젝트 수정, 단계 상세,
 * 업체 요청 상세, 관리자 회원/업체 상세 — 도 같은 breakpoint 경계값과
 * 대표 크기에서 안전한지 확인한다. 이 화면들은 실제 데이터(프로젝트,
 * 서비스 신청, 배정, 견적)가 있어야 의미 있는 검사가 되므로, 파이프라인을
 * 한 번 돌려 만든 데이터를 여러 화면에서 재사용한다.
 */
const CORE_WIDTHS = [320, 390, 430, 768, 1024, 1366, 639, 640, 641, 767, 768, 769, 1023, 1024, 1025];

test("프로젝트 수정·단계 상세·업체 요청 상세·관리자 상세 화면이 대표 크기에서 안전하다", async ({ page }) => {
  const projectName = `E2E상세화면-${Date.now()}`;

  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  const projectId = await createProject(page, projectName);
  await requestMovingService(page, projectId, "남양주시 별내동 아주긴지역명테스트");

  await page.goto(`/projects/${projectId}/edit`);
  await checkWidths(page, CORE_WIDTHS);

  await page.goto(`/projects/${projectId}/candidate`);
  await checkWidths(page, CORE_WIDTHS);
  await logout(page);

  await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
  await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);
  await logout(page);

  await login(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
  await acceptAndQuoteAsPartner(page, projectName, "기본형 이사 견적", 350000);

  // acceptAndQuoteAsPartner가 끝난 시점 화면(업체 요청 상세)에서 그대로 검사한다.
  await checkWidths(page, CORE_WIDTHS);

  await loginViaSession(page, E2E_ADMIN.email);
  await page.goto("/admin");
  await checkWidths(page, CORE_WIDTHS);

  const me = await page.request.get("/api/auth/me").then((r) => r.json());
  await page.goto(`/admin/users/${me.user.id}`);
  await checkWidths(page, CORE_WIDTHS);

  await page.goto("/admin/admins");
  await checkWidths(page, CORE_WIDTHS);

  await page.goto("/admin/handovers");
  await checkWidths(page, CORE_WIDTHS);
});
