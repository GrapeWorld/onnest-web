import { test as base, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DATABASE_URL } from "./global-setup";

const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });

/**
 * 로그인(login/loginEmail)과 서비스 신청 생성·취소(serviceRequest/
 * serviceRequestCancel)는 IP·계정당 시도 횟수를 제한한다. 스위트 전체가
 * 이 액션들을 여러 테스트에 걸쳐 반복하면(특히 serviceRequest는 시간당
 * 10회로 한도가 낮다) 마지막 몇 테스트가 실제로 한도에 걸려 실패할 수
 * 있어, 매 테스트 시작 전 이 버킷들만 지운다. 다른 rate limit 규칙(가입,
 * 견적 등록 등)의 동시성 자체를 검증하는 테스트가 생기면 그 액션은
 * 여기 포함하지 않는다.
 */
export const test = base.extend<{ resetLoginRateLimit: void }>({
  resetLoginRateLimit: [
    async ({}, use) => {
      await prisma.rateLimitBucket.deleteMany({
        where: { action: { in: ["login", "loginEmail", "serviceRequest", "serviceRequestCancel"] } },
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
export type { Page };
