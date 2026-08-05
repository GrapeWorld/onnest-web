import { getProviderCredentials } from "./providers";
import type { NormalizedProfile } from "./types";

const AUTHORIZATION_ENDPOINT = "https://nid.naver.com/oauth2.0/authorize";
const TOKEN_ENDPOINT = "https://nid.naver.com/oauth2.0/token";
const USERINFO_ENDPOINT = "https://openapi.naver.com/v1/nid/me";

export function buildNaverAuthorizationUrl({
  redirectUri,
  state,
}: {
  redirectUri: string;
  state: string;
}) {
  const { clientId } = getProviderCredentials("naver");
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url;
}

export async function exchangeNaverCode({
  code,
  state,
  redirectUri,
}: {
  code: string;
  state: string;
  redirectUri: string;
}) {
  const { clientId, clientSecret } = getProviderCredentials("naver");
  // 네이버 토큰 엔드포인트는 다른 provider와 달리 state를 다시 요구한다
  // (공식 문서 기준 — redirect_uri만으로는 충분하지 않다고 명시돼 있다).
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
    state,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("네이버 토큰 교환에 실패했습니다.");
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("네이버 응답에 access_token이 없습니다.");
  }
  return { accessToken: data.access_token };
}

type NaverMeResponse = {
  response?: {
    id?: string;
    email?: string;
    name?: string;
    nickname?: string;
    profile_image?: string;
  };
};

export async function fetchNaverProfile(accessToken: string): Promise<NormalizedProfile> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("네이버 사용자 정보 조회에 실패했습니다.");
  }
  const data = (await response.json()) as NaverMeResponse;
  const account = data.response;
  if (!account?.id) {
    throw new Error("네이버 응답에 사용자 id가 없습니다.");
  }

  return {
    provider: "naver",
    providerAccountId: account.id,
    email: account.email ?? null,
    // 네이버 API는 이메일 인증 여부를 별도 필드로 내려주지 않는다. 네이버
    // 아이디 자체가 가입 시 실명·본인 인증을 거치므로 이메일이 존재하면
    // 검증된 것으로 간주한다 — v1 정책 판단이며, 재검토가 필요하면 이
    // 값을 false로 바꿔 이메일 회원가입 안내 경로로 강제할 수 있다.
    emailVerified: Boolean(account.email),
    name: account.name ?? account.nickname ?? null,
    profileImage: account.profile_image ?? null,
  };
}
