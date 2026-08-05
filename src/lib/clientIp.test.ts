import { describe, expect, it } from "vitest";
import { getClientIp } from "@/lib/clientIp";

function requestWithHeaders(headers: Record<string, string>) {
  return new Request("http://localhost", { headers });
}

describe("getClientIp", () => {
  it("uses a single x-forwarded-for value", () => {
    expect(getClientIp(requestWithHeaders({ "x-forwarded-for": "203.0.113.5" }))).toBe(
      "203.0.113.5",
    );
  });

  it("takes only the first IP when multiple proxies are chained", () => {
    expect(
      getClientIp(
        requestWithHeaders({ "x-forwarded-for": "203.0.113.5, 10.0.0.1, 10.0.0.2" }),
      ),
    ).toBe("203.0.113.5");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(requestWithHeaders({ "x-real-ip": "198.51.100.9" }))).toBe(
      "198.51.100.9",
    );
  });

  it("returns 'unknown' when neither header is present", () => {
    expect(getClientIp(requestWithHeaders({}))).toBe("unknown");
  });

  it("does not throw on a malformed IP string and returns it lowercased", () => {
    expect(
      getClientIp(requestWithHeaders({ "x-forwarded-for": "not-an-ip;drop table" })),
    ).toBe("not-an-ip;drop table");
  });

  it("normalizes bracketed IPv6 with a port", () => {
    expect(
      getClientIp(requestWithHeaders({ "x-forwarded-for": "[2001:DB8::1]:443" })),
    ).toBe("2001:db8::1");
  });

  it("normalizes an IPv4-mapped IPv6 address to its IPv4 form", () => {
    expect(
      getClientIp(requestWithHeaders({ "x-forwarded-for": "::ffff:203.0.113.5" })),
    ).toBe("203.0.113.5");
  });

  it("is spoofable when the request bypasses a trusted proxy", () => {
    // 이 값은 클라이언트가 자유롭게 채울 수 있는 헤더에서 온다. 신뢰할 수 있는
    // 프록시가 없는 환경에서는 이 테스트가 통과한다는 사실 자체가 위협이다 —
    // 클라이언트는 원하는 어떤 IP도 이 헤더에 넣어 rate limit을 우회할 수 있다.
    expect(
      getClientIp(requestWithHeaders({ "x-forwarded-for": "1.2.3.4" })),
    ).toBe("1.2.3.4");
  });
});
