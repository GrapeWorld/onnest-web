// global-setup.ts가 시드하는 계정과 spec 파일들이 공유하는 상수.
// 값 자체를 바꾸려면 global-setup.ts의 시드 로직도 함께 맞춰야 한다.

// playwright.config.ts의 webServer.env.SESSION_SECRET과 helpers.ts의
// 세션 쿠키 직접 발급이 이 값을 공유한다 — 둘이 어긋나면 봉인된 쿠키를
// 서버가 풀지 못한다.
export const E2E_SESSION_SECRET =
  "e2e-test-session-secret-not-for-production-use-32chars";

export const E2E_PASSWORD = "TestPass1234!";

export const E2E_ADMIN = {
  email: "e2e.admin@onnesthome.com",
  password: E2E_PASSWORD,
  name: "E2E관리자",
};

export const E2E_PARTNER_NAME = "E2E테스트이사";
export const E2E_PARTNER_SERVICE_TYPE = "이사";

export const E2E_PARTNER_OWNER = {
  email: "e2e.partner@onnesthome.com",
  password: E2E_PASSWORD,
  name: "E2E업체대표",
};

export const E2E_CUSTOMER = {
  email: "e2e.customer@onnesthome.com",
  password: E2E_PASSWORD,
  name: "E2E고객",
};
