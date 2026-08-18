import type { PropertySourceLabel } from "@/data/candidateProperty";

/**
 * 원본 매물 URL 검증. http/https만 허용하고 javascript:/data:/file: 등은
 * 거부한다. 서버는 이 URL을 절대 요청(fetch)하지 않는다 — 출처 확인·외부
 * 페이지 재방문 용도로만 문자열을 저장한다.
 */
export function isSafeExternalUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

const NAVER_REAL_ESTATE_HOSTS = new Set([
  "fin.land.naver.com",
  "new.land.naver.com",
  "land.naver.com",
]);

/**
 * URL 도메인만으로 출처 라벨을 고른다. 외부 페이지 내용을 조회하지 않고
 * 호스트 이름만 비교한다 — "일치"를 보장하지 않는 단순 표시용 라벨이다.
 * 검증에 실패한(안전하지 않은) URL은 호출하지 않는다는 전제다.
 */
export function getPropertySourceLabel(value: string): PropertySourceLabel {
  try {
    const host = new URL(value).hostname.toLowerCase();
    if (NAVER_REAL_ESTATE_HOSTS.has(host)) return "네이버페이 부동산";
    return "기타 외부 매물";
  } catch {
    return "기타 외부 매물";
  }
}
