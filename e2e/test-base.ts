import { test as base, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DATABASE_URL } from "./global-setup";

const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });

/**
 * /api/auth/login은 IP·이메일당 시도 횟수를 제한한다(rateLimits.login/loginEmail).
 * 스위트 전체가 실제 로그인 폼을 여러 테스트에 걸쳐 반복하면 이 한도에
 * 걸릴 수 있어, 매 테스트 시작 전 로그인 관련 버킷만 지운다. signup·
 * serviceRequest 등 다른 rate limit 규칙의 동시성을 검증하는 테스트가
 * 있을 수 있으니 그 버킷까지 지우지 않도록 액션을 좁혀둔다.
 */
export const test = base.extend<{ resetLoginRateLimit: void }>({
  resetLoginRateLimit: [
    async ({}, use) => {
      await prisma.rateLimitBucket.deleteMany({
        where: { action: { in: ["login", "loginEmail"] } },
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
