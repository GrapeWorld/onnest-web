import { test, expect } from "./test-base";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import {
  login,
  logout,
  loginViaSession,
  createProject,
  requestMovingService,
  assignPartnerViaAdmin,
  acceptAndQuoteAsPartner,
} from "./helpers";
import { checkWidths } from "./responsive";
import { E2E_DATABASE_URL } from "./global-setup";
import { E2E_ADMIN, E2E_PASSWORD, E2E_CUSTOMER, E2E_PARTNER_NAME, E2E_PARTNER_OWNER } from "./fixtures";

test("서비스 신청 전체 흐름에서 역할별 알림이 생성되고, 헤더 뱃지·읽음 처리·안전한 이동이 맞물린다", async ({
  page,
}) => {
  // 이 파일을 단독 실행하면(전체 스위트로 이미 데워진 dev 서버가 아니면)
  // 여러 화면을 처음 컴파일하는 비용이 기본 30초 예산을 넘길 수 있다.
  test.setTimeout(60_000);
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

test("업체 재배정·담당자 지정·견적 선택·고객 취소 요청 시 관련자에게 정확히 알림이 간다", async ({ page }) => {
  // 로그인·로그아웃을 여러 번 오가며 API를 다섯 단계 이상 순차 호출하는
  // 무거운 시나리오라 기본 30초로는 dev 서버 콜드 컴파일 시점에 빠듯하다.
  test.setTimeout(60_000);
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const suffix = Date.now();
  const projectName = `E2E알림확장-${suffix}`;

  try {
    // 준비: 두 번째 업체(대표+직원)를 만든다 — 재배정 알림을 확인하려면
    // 서로 다른 업체가 최소 2곳 필요하다.
    const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
    const partnerB = await prisma.partner.create({
      data: {
        name: `E2E알림확장업체B-${suffix}`,
        serviceType: "이사",
        partnerCode: `E2ENOTIFB${suffix}`,
        verificationStatus: "APPROVED",
        verifiedAt: new Date(),
      },
    });
    const partnerBOwner = await prisma.user.create({
      data: {
        email: `e2e.notif.partnerb.owner.${suffix}@onnesthome.com`,
        passwordHash,
        name: "E2E업체B대표",
        memberType: "PARTNER",
        partnerId: partnerB.id,
        termsAgreedAt: new Date(),
      },
    });
    await prisma.partnerMembership.create({
      data: { partnerId: partnerB.id, userId: partnerBOwner.id, role: "OWNER", status: "ACTIVE" },
    });
    const partnerBStaff = await prisma.user.create({
      data: {
        email: `e2e.notif.partnerb.staff.${suffix}@onnesthome.com`,
        passwordHash,
        name: "E2E업체B직원",
        memberType: "PARTNER",
        partnerId: partnerB.id,
        termsAgreedAt: new Date(),
      },
    });
    await prisma.partnerMembership.create({
      data: { partnerId: partnerB.id, userId: partnerBStaff.id, role: "STAFF", status: "ACTIVE" },
    });

    // 1. 고객 신청 → 관리자가 업체 A(전역 시드 업체)에 배정.
    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
    const projectId = await createProject(page, projectName);
    await requestMovingService(page, projectId, "남양주시 별내동");
    await logout(page);

    await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);

    const request = await prisma.serviceRequest.findFirstOrThrow({
      where: { project: { name: projectName } },
    });
    const partnerAOwner = await prisma.user.findUniqueOrThrow({ where: { email: E2E_PARTNER_OWNER.email } });

    // 2. 관리자가 업체 B로 재배정 — 업체 A 대표는 접근 종료 알림을, 업체 B
    // 대표는 신규 배정 알림을 받는다.
    const reassignResponse = await page.request.patch(`/api/admin/service-requests/${request.id}`, {
      data: { partnerId: partnerB.id },
    });
    expect(reassignResponse.ok()).toBe(true);

    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: partnerAOwner.id, type: "PARTNER_SERVICE_REQUEST_UNASSIGNED" },
        }),
      )
      .toBeGreaterThan(0);
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: partnerBOwner.id, type: "PARTNER_NEW_SERVICE_REQUEST" },
        }),
      )
      .toBeGreaterThan(0);

    // 3. 업체 B 대표가 자기 직원을 담당자로 지정 — 그 직원에게 알림이 간다.
    // (여기부터는 loginViaSession으로 세션 쿠키만 바꿔가며 API를 직접
    // 호출한다 — 화면 이동이 없으니 UI 클릭 방식의 logout()은 쓰지 않는다.
    // loginViaSession 자체가 세션 쿠키를 덮어써 다음 사용자로 완전히
    // 전환하므로 별도 로그아웃이 필요 없다.)
    await loginViaSession(page, partnerBOwner.email);
    const staffAssignResponse = await page.request.patch(
      `/api/partner/service-requests/${request.id}/staff`,
      { data: { partnerStaffId: partnerBStaff.id } },
    );
    expect(staffAssignResponse.ok()).toBe(true);
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: partnerBStaff.id, type: "PARTNER_STAFF_ASSIGNED" },
        }),
      )
      .toBeGreaterThan(0);

    // 4. 업체 B가 견적을 등록하고, 고객이 그 견적을 선택 — 업체 B
    // 구성원(대표+담당 직원)에게 견적 선택 알림이 간다.
    const quoteResponse = await page.request.post(
      `/api/partner/service-requests/${request.id}/quotes`,
      { data: { title: "기본형", amount: 500000 } },
    );
    expect(quoteResponse.ok()).toBe(true);
    const quote = await quoteResponse.json();

    await loginViaSession(page, E2E_CUSTOMER.email);
    const selectResponse = await page.request.patch(`/api/my/service-requests/${request.id}`, {
      data: { quoteId: quote.id },
    });
    expect(selectResponse.ok()).toBe(true);
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: {
            recipientUserId: { in: [partnerBOwner.id, partnerBStaff.id] },
            type: "PARTNER_QUOTE_SELECTED",
          },
        }),
      )
      .toBeGreaterThanOrEqual(2);

    // 5. 고객이 배정 후 취소를 요청 — 업체 B 구성원과 관리자 모두에게
    // 취소 요청 알림이 간다.
    const cancelResponse = await page.request.post(`/api/my/service-requests/${request.id}/cancel`, {
      data: { reason: "일정이 바뀌었습니다" },
    });
    expect(cancelResponse.ok()).toBe(true);
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: {
            recipientUserId: { in: [partnerBOwner.id, partnerBStaff.id] },
            type: "PARTNER_CANCEL_REQUESTED",
          },
        }),
      )
      .toBeGreaterThanOrEqual(2);
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: E2E_ADMIN.email } });
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: admin.id, type: "ADMIN_CUSTOMER_CANCEL_REQUESTED" },
        }),
      )
      .toBeGreaterThan(0);
  } finally {
    await prisma.$disconnect();
  }
});

test("업체가 스스로 요청을 거절하면 관리자에게 알리고, 관리자가 문의 담당자를 지정하면 그 담당자에게 알린다", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });
  const suffix = Date.now();
  const projectName = `E2E거절알림-${suffix}`;

  try {
    // 1. 신청 접수 → 업체 A 배정(취소 요청 없이 바로 업체가 거절).
    await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
    const projectId = await createProject(page, projectName);
    await requestMovingService(page, projectId, "남양주시 별내동");
    await logout(page);

    await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
    await assignPartnerViaAdmin(page, projectName, E2E_PARTNER_NAME);
    await logout(page);

    const request = await prisma.serviceRequest.findFirstOrThrow({
      where: { project: { name: projectName } },
    });
    const admin = await prisma.user.findUniqueOrThrow({ where: { email: E2E_ADMIN.email } });

    await loginViaSession(page, E2E_PARTNER_OWNER.email);
    const rejectResponse = await page.request.patch(`/api/partner/service-requests/${request.id}`, {
      data: { status: "취소", reason: "지역 밖이라 처리가 어렵습니다" },
    });
    expect(rejectResponse.ok()).toBe(true);
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: admin.id, type: "ADMIN_PARTNER_REJECTED" },
        }),
      )
      .toBeGreaterThan(0);

    // 2. 관리자가 문의를 다른 관리자에게 배정 — 배정된 관리자에게 알림이 간다.
    // (login()은 /auth/login 폼으로 직접 이동해 제출하므로, 현재 쿠키가
    // 무엇이든 상관없이 그 자리에서 새로 로그인된다 — 별도 로그아웃 불필요.)
    const passwordHash = await bcrypt.hash(E2E_PASSWORD, 10);
    const secondAdmin = await prisma.user.create({
      data: {
        email: `e2e.notif.admin2.${suffix}@onnesthome.com`,
        passwordHash,
        name: "E2E관리자2",
        adminRole: "viewer",
        termsAgreedAt: new Date(),
      },
    });
    const inquiry = await prisma.inquiry.create({
      data: {
        name: "E2E문의자",
        email: `e2e.notif.inquiry.${suffix}@example.com`,
        phone: "010-9000-0003",
        type: "개인 고객 문의",
        message: "담당자 배정 알림 테스트용 문의입니다.",
        privacyAgreedAt: new Date(),
      },
    });

    // 세션 쿠키가 아직 업체 대표 것이라 /auth/login이 로그인 폼 대신 /my로
    // 돌려보낸다 — 실제 로그인 폼을 다시 쓰려면 먼저 쿠키를 지워야 한다.
    await page.context().clearCookies();
    await login(page, E2E_ADMIN.email, E2E_ADMIN.password);
    const assignResponse = await page.request.patch(`/api/admin/inquiries/${inquiry.id}`, {
      data: { assigneeId: secondAdmin.id },
    });
    expect(assignResponse.ok()).toBe(true);
    await expect
      .poll(async () =>
        prisma.notification.count({
          where: { recipientUserId: secondAdmin.id, type: "ADMIN_INQUIRY_ASSIGNED" },
        }),
      )
      .toBeGreaterThan(0);
  } finally {
    await prisma.$disconnect();
  }
});

test("320px~768px에서 알림함·헤더 종 아이콘·모바일 메뉴에 가로 오버플로가 없다", async ({ page }) => {
  await login(page, E2E_CUSTOMER.email, E2E_CUSTOMER.password);
  await page.goto("/notifications");
  await checkWidths(page, [320, 360, 390, 768]);
});
