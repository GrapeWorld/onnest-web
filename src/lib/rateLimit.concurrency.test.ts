import { describe, expect, it } from "vitest";
import { checkRateLimit, rateLimits } from "@/lib/rateLimit";

/**
 * rateLimit.test.ts는 Prisma를 mock해서 판정 로직만 검증한다. 이 파일은
 * 실제(테스트 전용) DB에 진짜 동시 요청을 보내 upsert/increment 자체가
 * 원자적인지 — 즉 count가 하나도 유실되지 않는지 — 검증한다. mock으로는
 * 진짜 경쟁 상태를 재현할 수 없기 때문에 분리했다.
 */
describe("checkRateLimit concurrency (real DB)", () => {
  it("never allows more successes than the configured max under concurrent load", async () => {
    const identifier = `concurrency-${Date.now()}-${Math.random()}`;
    const rule = rateLimits.findId;
    const attempts = rule.max + 5;

    const results = await Promise.all(
      Array.from({ length: attempts }, () => checkRateLimit("findId", identifier)),
    );

    const successCount = results.filter((result) => result.ok).length;
    expect(successCount).toBe(rule.max);
  });

  it("tracks different actions and identifiers independently", async () => {
    const suffix = `${Date.now()}-${Math.random()}`;
    const [byAction, byIdentifier] = await Promise.all([
      checkRateLimit("login", `shared-id-${suffix}`),
      checkRateLimit("signup", `shared-id-${suffix}`),
    ]);

    expect(byAction.ok).toBe(true);
    expect(byIdentifier.ok).toBe(true);
  });
});
