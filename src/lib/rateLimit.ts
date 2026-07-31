import { prisma } from "@/lib/prisma";

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
  signup: { windowSeconds: 3600, max: 5 },
  inquiry: { windowSeconds: 3600, max: 5 },
  serviceRequest: { windowSeconds: 3600, max: 10 },
} satisfies Record<string, RateLimitRule>;

/**
 * 프록시를 거치므로 소켓 주소 대신 헤더에서 클라이언트 IP를 읽는다.
 * 헤더가 없으면(로컬 등) 단일 키로 묶어 최소한의 제한은 걸리게 한다.
 */
export function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export type RateLimitResult =
  { ok: true } | { ok: false; retryAfterSeconds: number };

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
  const windowStart = new Date(now.getTime() - rule.windowSeconds * 1000);

  // 지난 기록은 지워 테이블이 무한정 커지지 않게 한다.
  await prisma.rateLimitHit.deleteMany({
    where: { createdAt: { lt: windowStart } },
  });

  const count = await prisma.rateLimitHit.count({
    where: { action, identifier, createdAt: { gte: windowStart } },
  });

  if (count >= rule.max) {
    const oldest = await prisma.rateLimitHit.findFirst({
      where: { action, identifier, createdAt: { gte: windowStart } },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });
    const resetAt = oldest
      ? oldest.createdAt.getTime() + rule.windowSeconds * 1000
      : now.getTime() + rule.windowSeconds * 1000;
    return {
      ok: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((resetAt - now.getTime()) / 1000),
      ),
    };
  }

  await prisma.rateLimitHit.create({ data: { action, identifier } });
  return { ok: true };
}

/** 남은 시간을 사람이 읽는 문구로 바꾼다. */
export function formatRetryAfter(seconds: number) {
  if (seconds < 60) return `${seconds}초`;
  return `${Math.ceil(seconds / 60)}분`;
}
