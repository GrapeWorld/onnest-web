import { test as base, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { E2E_DATABASE_URL } from "./global-setup";

const prisma = new PrismaClient({ datasources: { db: { url: E2E_DATABASE_URL } } });

/**
 * 로그인(login/loginEmail), 서비스 신청 생성·취소(serviceRequest/
 * serviceRequestCancel), 매물 후보 등록·수정·삭제·체크리스트·희망조건
 * 저장(candidateProperty)은 IP·계정당 시도 횟수를 제한한다. 스위트 전체가
 * 공유 계정(E2E_CUSTOMER 등)으로 이 액션들을 여러 테스트 파일에 걸쳐
 * 반복하면(특히 serviceRequest는 시간당 10회, candidateProperty도 시간당
 * 60회로 스위트 규모가 커질수록 여유가 줄어든다) 스위트 뒷부분의 테스트가
 * 실제로 한도에 걸려 실패할 수 있다 — 매 테스트 시작 전 이 버킷들만
 * 지운다(운영 rate limit 규칙 자체는 건드리지 않는다). 스위트 전체 테스트
 * 개수는 파일이 추가될 때마다 바뀌므로 여기 고정 숫자로 적지 않는다 —
 * `npx playwright test --list`로 현재 개수를 확인한다.
 * 다른 rate limit 규칙(가입, 견적 등록 등)의 동시성 자체를 검증하는
 * 테스트가 생기면 그 액션은 여기 포함하지 않는다.
 */
export const test = base.extend<{ resetSharedRateLimits: void }>({
  resetSharedRateLimits: [
    async ({}, use) => {
      await prisma.rateLimitBucket.deleteMany({
        where: { action: { in: ["login", "loginEmail", "serviceRequest", "serviceRequestCancel", "candidateProperty"] } },
      });
      await use();
    },
    { auto: true },
  ],
});

export { expect };
export type { Page };
