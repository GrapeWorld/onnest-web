/**
 * 요청에서 클라이언트 IP를 뽑는다. rate limit의 identifier로만 쓰는 값이라
 * "유효한 IP 주소"임을 보장하지는 않는다 — 문자열이 일관되게 같은 클라이언트를
 * 가리키기만 하면 된다.
 *
 * 신뢰 경계: Vercel처럼 신뢰할 수 있는 프록시가 `x-forwarded-for`를 항상
 * 실제 클라이언트 IP로 앞에 채워준다는 전제를 둔다. 프록시 없이 애플리케이션을
 * 직접 인터넷에 노출하면 클라이언트가 이 헤더를 마음대로 위조할 수 있으므로,
 * 그 환경에서는 이 값을 신뢰해서는 안 된다(docs/DEPLOY.md 참고).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // 여러 프록시를 거치면 "client, proxy1, proxy2" 형태로 쌓인다.
    // 원 클라이언트에 가장 가까운 첫 값만 쓴다.
    const first = forwarded.split(",")[0]?.trim();
    if (first) return normalizeIp(first);
  }

  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return normalizeIp(realIp);

  return "unknown";
}

/**
 * "[::1]:1234"처럼 대괄호·포트가 붙은 표기와 IPv4-mapped IPv6("::ffff:127.0.0.1")를
 * 정리해, 같은 클라이언트가 항상 같은 identifier로 묶이게 한다. 형식이 이상해도
 * 거부하지 않고 그대로(소문자화만) 돌려준다 — 위조 여부 판단이 아니라 버킷
 * 키를 만드는 용도이기 때문이다.
 */
function normalizeIp(rawValue: string): string {
  let value = rawValue;
  if (value.startsWith("[")) {
    const closing = value.indexOf("]");
    if (closing > -1) value = value.slice(1, closing);
  }

  const mapped = value.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return mapped[1]!;

  return value.toLowerCase();
}
