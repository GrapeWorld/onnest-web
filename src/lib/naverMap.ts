/**
 * 네이버 클라우드 플랫폼(NCP) Maps API — Geocoding·Static Map만 쓴다. 이
 * 클라이언트 라이브러리는 서버에서만 import한다: Client Secret은 절대
 * 브라우저로 보내지 않는다. 지도 API가 미설정이거나 실패해도 매물
 * 저장·조회 자체는 항상 성공해야 하므로, 이 파일의 함수는 예외를 던지지
 * 않고 항상 null(또는 실패 표시)을 돌려준다 — 호출부가 try/catch 없이도
 * 안전하게 쓸 수 있다.
 */

const GEOCODE_URL = "https://maps.apigw.ntruss.com/map-geocode/v2/geocode";
const STATIC_MAP_URL = "https://maps.apigw.ntruss.com/map-static/v2/raster";

function getCredentials(): { id: string; secret: string } | null {
  const id = process.env.NCP_MAP_CLIENT_ID;
  const secret = process.env.NCP_MAP_CLIENT_SECRET;
  if (!id || !secret) return null;
  return { id, secret };
}

export function isNaverMapConfigured() {
  return getCredentials() !== null;
}

export type Coordinates = { lat: number; lng: number };

/**
 * 주소 문자열을 좌표로 변환한다. 미설정·타임아웃·네트워크 오류·매칭 결과
 * 없음 등 어떤 이유로든 실패하면 콘솔에만 로그를 남기고 null을 돌려준다
 * — 이 호출 하나 때문에 매물 저장이 막히면 안 된다.
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  const credentials = getCredentials();
  if (!credentials) return null;
  const trimmed = address.trim();
  if (!trimmed) return null;

  try {
    const url = `${GEOCODE_URL}?query=${encodeURIComponent(trimmed)}`;
    const res = await fetch(url, {
      headers: {
        "x-ncp-apigw-api-key-id": credentials.id,
        "x-ncp-apigw-api-key": credentials.secret,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) {
      console.error("[naver-map] geocode request failed", res.status);
      return null;
    }
    const data = (await res.json()) as {
      status?: string;
      addresses?: { x?: string; y?: string }[];
    };
    const first = data.addresses?.[0];
    if (data.status !== "OK" || !first?.x || !first?.y) return null;

    const lng = Number(first.x);
    const lat = Number(first.y);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (error) {
    console.error("[naver-map] geocode failed", error);
    return null;
  }
}

/**
 * 좌표를 중심으로 한 정지 이미지 지도를 요청해 원본 응답을 그대로
 * 돌려준다. 인증 헤더는 서버에서만 붙이므로 클라이언트는 이 함수의
 * 결과(이미지 바이트)만 받고 키를 볼 수 없다. 실패하면 null.
 */
export async function fetchStaticMapImage(
  { lat, lng }: Coordinates,
  { width = 600, height = 300, level = 16 }: { width?: number; height?: number; level?: number } = {},
): Promise<{ body: ReadableStream; contentType: string } | null> {
  const credentials = getCredentials();
  if (!credentials) return null;

  try {
    const params = new URLSearchParams({
      w: String(width),
      h: String(height),
      center: `${lng},${lat}`,
      level: String(level),
      markers: `type:d|size:mid|pos:${lng} ${lat}`,
    });
    const res = await fetch(`${STATIC_MAP_URL}?${params.toString()}`, {
      headers: {
        "x-ncp-apigw-api-key-id": credentials.id,
        "x-ncp-apigw-api-key": credentials.secret,
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok || !res.body) {
      console.error("[naver-map] static map request failed", res.status);
      return null;
    }
    return { body: res.body, contentType: res.headers.get("content-type") ?? "image/png" };
  } catch (error) {
    console.error("[naver-map] static map fetch failed", error);
    return null;
  }
}
