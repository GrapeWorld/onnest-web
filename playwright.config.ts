import { defineConfig, devices } from "@playwright/test";
import { E2E_SESSION_SECRET } from "./e2e/fixtures";

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
const E2E_DATABASE_URL = "postgresql://onnest_e2e:onnest_e2e@127.0.0.1:54331/onnest_e2e";

export default defineConfig({
  testDir: "./e2e",
  // 역할(고객/관리자/업체)을 오가는 무거운 시나리오라 병렬 실행 시 CPU 경합으로
  // 스크롤 애니메이션·클릭 타이밍이 불안정해진다 — 개수가 적으니 순차 실행이 더 안전하다.
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `node_modules/.bin/next dev -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      SESSION_SECRET: E2E_SESSION_SECRET,
      APP_URL: BASE_URL,
      PW_E2E: "1",
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
