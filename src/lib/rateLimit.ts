import { prisma } from "@/lib/prisma";

export { getClientIp } from "@/lib/clientIp";

/**
 * 요청 횟수 제한.
 *
 * 서버리스에서는 인스턴스가 요청마다 갈릴 수 있어 메모리 카운터를 믿을 수 없다.
 * 그래서 DB에 기록해 인스턴스가 바뀌어도 함께 세도록 한다.
 *
 * 비공개 베타 규모에 맞춘 단순한 구현이다. 트래픽이 커지면
 * Upstash Redis 같은 전용 저장소로 옮기는 편이 낫다.
 */

export type RateLimitRule = {
  /** 이 시간(초) 안에 */
  windowSeconds: number;
  /** 최대 몇 번까지 허용할지 */
  max: number;
};

export const rateLimits = {
  login: { windowSeconds: 600, max: 10 },
  loginEmail: { windowSeconds: 600, max: 10 },
  signup: { windowSeconds: 3600, max: 5 },
  inquiry: { windowSeconds: 3600, max: 5 },
  serviceRequest: { windowSeconds: 3600, max: 10 },
  serviceRequestCancel: { windowSeconds: 3600, max: 20 },
  forgotPassword: { windowSeconds: 3600, max: 5 },
  resetPassword: { windowSeconds: 3600, max: 10 },
  findId: { windowSeconds: 3600, max: 5 },
  oauthStart: { windowSeconds: 600, max: 20 },
  oauthCallback: { windowSeconds: 600, max: 20 },
  oauthSignupComplete: { windowSeconds: 600, max: 10 },
  oauthLink: { windowSeconds: 600, max: 10 },
  inquiryMessage: { windowSeconds: 3600, max: 10 },
  inquiryLinkRequest: { windowSeconds: 3600, max: 5 },
  inquirySatisfaction: { windowSeconds: 3600, max: 10 },
  partnerInvite: { windowSeconds: 3600, max: 20 },
  partnerRequestStatus: { windowSeconds: 3600, max: 100 },
  partnerRequestStaff: { windowSeconds: 3600, max: 100 },
  partnerRequestNote: { windowSeconds: 3600, max: 100 },
  partnerRequestContact: { windowSeconds: 3600, max: 100 },
  // 견적 등록(POST)·삭제(DELETE)가 버킷을 공유한다 — 같은 하위 자원에 대한
  // 쓰기라 따로 셀 이유가 없다. 파일 업로드·삭제도 마찬가지.
  partnerRequestQuote: { windowSeconds: 3600, max: 60 },
  partnerRequestFile: { windowSeconds: 3600, max: 60 },
  // 매물 후보 등록·수정·삭제·체크리스트·희망조건 저장이 버킷을 공유한다 —
  // 개인 메모성 쓰기라 종류별로 나눌 이유가 없다. 여러 매물을 연달아
  // 저장하는 정상 사용을 막지 않을 만큼 넉넉하게 잡는다.
  candidateProperty: { windowSeconds: 3600, max: 60 },
  // 최고관리자 전용 Excel 내보내기. 개인정보가 포함된 파일을 반복 생성하는
  // 남용을 막는다 — 정상적인 상담·민원 대응 업무량보다 넉넉하게 잡는다.
  adminExport: { windowSeconds: 3600, max: 30 },
} satisfies Record<string, RateLimitRule>;

export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterSeconds: number };

export function getRateLimitWindow(now: Date, windowSeconds: number) {
  const windowMs = windowSeconds * 1000;
  const startMs = Math.floor(now.getTime() / windowMs) * windowMs;
  return {
    windowStart: new Date(startMs),
    expiresAt: new Date(startMs + windowMs),
  };
}

async function cleanupExpiredBuckets(now: Date) {
  // 정리는 요청의 핵심 경로가 아니므로 일부 요청에서만 실행하고 실패를 전파하지 않는다.
  if (Math.random() >= 0.01) return;
  try {
    await prisma.rateLimitBucket.deleteMany({ where: { expiresAt: { lt: now } } });
  } catch {
    console.warn("[rate-limit] expired bucket cleanup failed");
  }
}

/**
 * 제한에 걸리면 ok:false를 돌려준다.
 * 성공/실패와 무관하게 시도 자체를 세므로, 호출부에서 검증 전에 부른다.
 */
export async function checkRateLimit(
  action: keyof typeof rateLimits,
  identifier: string,
): Promise<RateLimitResult> {
  const rule = rateLimits[action];
  const now = new Date();
  const { windowStart, expiresAt } = getRateLimitWindow(
    now,
    rule.windowSeconds,
  );

  // 복합 PK에 대한 upsert/increment는 DB가 원자적으로 처리하므로 여러 서버
  // 인스턴스에서 동시에 요청해도 count+insert 사이로 우회할 수 없다.
  const bucket = await prisma.rateLimitBucket.upsert({
    where: {
      action_identifier_windowStart: { action, identifier, windowStart },
    },
    create: { action, identifier, windowStart, expiresAt, count: 1 },
    update: { count: { increment: 1 } },
    select: { count: true },
  });

  await cleanupExpiredBuckets(now);

  if (bucket.count > rule.max) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((expiresAt.getTime() - now.getTime()) / 1000),
      ),
    };
  }

  return { ok: true };
}

/** 남은 시간을 사람이 읽는 문구로 바꾼다. */
export function formatRetryAfter(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.ceil(seconds / 60)}분`;
}
