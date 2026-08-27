import { test, expect } from "./test-base";
import { PrismaClient } from "@prisma/client";
import {
  login,
  logout,
  createProject,
  requestMovingService,
  assignPartnerViaAdmin,
  acceptAndQuoteAsPartner,
} from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN, E2E_CUSTOMER, E2E_PARTNER_NAME, E2E_PARTNER_OWNER } from "./fixtures";

test("서비스 신청 전체 흐름에서 역할별 알림이 생성되고, 헤더 뱃지·읽음 처리·안전한 이동이 맞물린다", async ({
  page,
}) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const projectName = `E2E알림흐름-${Date.now()}`;

  try {
    // 1. 고객이 프로젝트를 만들고 서비스를 신청한다 — 관리자(super)에게
    // ADMIN_NEW_SERVICE_REQUEST 알림이 생겨야 한다.
    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
    const projectId = await createProject(page, projectName);
    await requestMovingService(page, projectId, "남양주시 별내동");
    await logout(page);

    // 2. 관리자: 헤더 종 아이콘에 안읽음 뱃지가 뜨고, 팝오버 클릭 시
    // 읽음 처리되며 /admin/service-leads로 이동한다.
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
    const adminBell = page.getByRole("banner").getByRole("button", { name: /알림/ });
    await expect(adminBell).toContainText(/\d/);
    await adminBell.click();
    const newRequestItem = page.getByRole("button", { name: new RegExp(projectName) });
    await expect(newRequestItem).toContainText("확인 후 업체를 배정해주세요");
    const [readResponse] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/notifications/") && res.url().endsWith("/read")),
      newRequestItem.click(),
    ]);
    expect(readResponse.ok()).toBe(true);
    await page.waitForURL("**/admin/service-leads");
    await expect(page.getByRole("banner").getByRole("button", { name: "알림" })).toBeVisible();

    // 3. 관리자가 업체를 배정한다 — 고객에게 SERVICE_REQUEST_PARTNER_ASSIGNED,
    // 업체 대표(OWNER)에게 PARTNER_NEW_SERVICE_REQUEST 알림이 각각 생긴다.
    await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);
    await logout(page);

    const customer = await prisma.user.findUniqueOrThrow({ where: { email: E2E_CUSTOMER.email } });
    const partnerOwner = await prisma.user.findUniqueOrThrow({ where: { email: E2E_PARTNER_OWNER.email } });

    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: customer.id, type: "SERVICE_REQUEST_PARTNER_ASSIGNED" },
        }),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: partnerOwner.id, type: "PARTNER_NEW_SERVICE_REQUEST" },
        }),
      )
      .toBeGreaterThan(0);

    // 4. 업체가 수락하고 견적을 등록한다 — 고객에게
    // SERVICE_REQUEST_ACCEPTED · SERVICE_REQUEST_QUOTE_RECEIVED가 생긴다.
    await login(page, E2E_PARTNER_OWNER.email, E2E_PARTNER_OWNER.password);
    await acceptAndQuoteAsPartner(page, projectName, "기본형", 500000);
    await logout(page);

    // 5. 고객: 전체 알림함에서 안읽음 3건(업체 배정·수락·견적 도착)을
    // 확인하고, "모두 읽음"이 뱃지·목록 상태를 함께 반영한다. 공유 E2E
    // 계정이라 다른 스펙이 먼저 만든 알림이 섞여 있을 수 있으므로, 텍스트가
    // 아니라 이번에 만들어진 정확한 알림 id로 각 항목을 찾는다.
    const newNotifications = await prisma.notification.findMany({
      where: {
        recipientUserId: customer.id,
        type: { in: ["SERVICE_REQUEST_PARTNER_ASSIGNED", "SERVICE_REQUEST_ACCEPTED", "SERVICE_REQUEST_QUOTE_RECEIVED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    expect(newNotifications).toHaveLength(3);

    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
    await page.goto("/notifications");
    for (const notification of newNotifications) {
      await expect(page.locator(`[data-notification-id="${notification.id}"]`)).toHaveAttribute(
        "data-notification-read",
        "false",
      );
    }

    await page.getByRole("button", { name: "모두 읽음으로 표시" }).click();
    await expect(page.getByRole("button", { name: "모두 읽음으로 표시" })).toBeDisabled();
    // router.refresh()로 서버 최신값이 반영돼, 같은 컴포넌트 인스턴스라도
    // 뱃지와 목록의 읽음 상태가 페이지 새로고침 없이 갱신되어야 한다.
    await expect(page.getByRole("banner").getByRole("button", { name: "알림" })).toBeVisible();
    for (const notification of newNotifications) {
      await expect(page.locator(`[data-notification-id="${notification.id}"]`)).toHaveAttribute(
        "data-notification-read",
        "true",
      );
    }
  } finally {
    await prisma.$disconnect();
  }
});

test("본인 소유가 아닌 알림은 읽음 처리할 수 없고, 로그인 없이는 알림함에 접근할 수 없다", async ({ page }) => {
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  try {
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: E2E_ADMIN.email } });
    const foreignNotification = await prisma.notification.create({
      data: {
        recipientUserId: admin.id,
        type: "MEMBER_STATUS_CHANGED",
        category: "ACCOUNT",
        title: "다른 사람 알림",
        body: "이 알림은 관리자 소유다.",
        internalPath: "/admin",
      },
    });

    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
    const response = await page.request.post(`/api/notifications/${foreignNotification.id}/read`);
    expect(response.status()).toBe(404);

    const stillUnread = await prisma.notification.findUniqueOrThrow({ where: { id: foreignNotification.id } });
    expect(stillUnread.readAt).toBeNull();
    await logout(page);

    // 로그아웃 상태에서는 헤더에 알림 진입점 자체가 없고, 전체 알림함은
    // 로그인 화면으로 리다이렉트된다.
    await expect(page.getByRole("banner").getByRole("button", { name: /알림/ })).toHaveCount(0);
    await page.goto("/notifications");
    await page.waitForURL("**/auth/login");
  } finally {
    await prisma.$disconnect();
  }
});

test("320px~768px에서 알림함·헤더 종 아이콘·모바일 메뉴에 가로 오버플로가 없다", async ({ page }) => {
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/notifications");
  await checkWidths(page, [320, 360, 390, 768]);
});
