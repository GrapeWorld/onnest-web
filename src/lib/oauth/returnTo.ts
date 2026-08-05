/**
 * returnTo가 사이트 내부 상대 경로인지 확인한다. 절대 URL, protocol-relative
 * 경로("//evil.com"), javascript: 등 외부로 나갈 수 있는 값은 전부 안전한
 * 기본값으로 대체한다 — 악성 리다이렉트(open redirect)를 막기 위한 방어선이다.
 */
export function sanitizeReturnTo(value: string | undefined | null, fallback = "/my") {
  if (!value) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  if (value.includes("\\")) return fallback;
  return value;
}
