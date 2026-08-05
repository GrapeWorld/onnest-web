import { getProviderCredentials } from "./providers";
import type { NormalizedProfile } from "./types";

const AUTHORIZATION_ENDPOINT = "https://kauth.kakao.com/oauth/authorize";
const TOKEN_ENDPOINT = "https://kauth.kakao.com/oauth/token";
const USERINFO_ENDPOINT = "https://kapi.kakao.com/v2/user/me";

export function buildKakaoAuthorizationUrl({
  redirectUri,
  state,
}: {
  redirectUri: string;
  state: string;
}) {
  const { clientId } = getProviderCredentials("kakao");
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url;
}

export async function exchangeKakaoCode({
  code,
  redirectUri,
}: {
  code: string;
  redirectUri: string;
}) {
  const { clientId, clientSecret } = getProviderCredentials("kakao");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("카카오 토큰 교환에 실패했습니다.");
  }
  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("카카오 응답에 access_token이 없습니다.");
  }
  return { accessToken: data.access_token };
}

type KakaoMeResponse = {
  id: number | string;
  kakao_account?: {
    email?: string;
    is_email_valid?: boolean;
    is_email_verified?: boolean;
    profile?: { nickname?: string; profile_image_url?: string };
  };
};

/** access token으로 카카오 자체 API를 직접 호출한다 — 서드파티 서명 검증이 필요 없는 이유. */
export async function fetchKakaoProfile(accessToken: string): Promise<NormalizedProfile> {
  const response = await fetch(USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error("카카오 사용자 정보 조회에 실패했습니다.");
  }
  const data = (await response.json()) as KakaoMeResponse;
  const account = data.kakao_account ?? {};

  return {
    provider: "kakao",
    providerAccountId: String(data.id),
    email: account.email ?? null,
    emailVerified: account.is_email_valid === true && account.is_email_verified === true,
    name: account.profile?.nickname ?? null,
    profileImage: account.profile?.profile_image_url ?? null,
  };
}
