import type { OAuthProvider } from "@/data/oauthProviders";
import { getAppUrl } from "@/lib/appUrl";
import type { NormalizedProfile } from "./types";
import {
  buildGoogleAuthorizationUrl,
  exchangeGoogleCode,
  verifyGoogleIdToken,
} from "./google";
import { buildKakaoAuthorizationUrl, exchangeKakaoCode, fetchKakaoProfile } from "./kakao";
import { buildNaverAuthorizationUrl, exchangeNaverCode, fetchNaverProfile } from "./naver";

export function getRedirectUri(provider: OAuthProvider) {
  return new URL(`/api/auth/oauth/${provider}/callback`, getAppUrl()).toString();
}

export function buildAuthorizationUrl(
  provider: OAuthProvider,
  params: { redirectUri: string; state: string; codeVerifier?: string; nonce?: string },
): URL {
  switch (provider) {
    case "google":
      if (!params.codeVerifier || !params.nonce) {
        throw new Error("Google 인증에 필요한 값이 없습니다.");
      }
      return buildGoogleAuthorizationUrl({
        redirectUri: params.redirectUri,
        state: params.state,
        codeVerifier: params.codeVerifier,
        nonce: params.nonce,
      });
    case "kakao":
      return buildKakaoAuthorizationUrl(params);
    case "naver":
      return buildNaverAuthorizationUrl(params);
  }
}

/** 인가 코드를 교환하고, provider별 방식(ID Token 검증 또는 REST 사용자정보 조회)으로 신원을 정규화한다. */
export async function completeOAuthExchange(
  provider: OAuthProvider,
  params: { code: string; redirectUri: string; codeVerifier?: string; state?: string; nonce?: string },
): Promise<NormalizedProfile> {
  switch (provider) {
    case "google": {
      if (!params.codeVerifier || !params.nonce) {
        throw new Error("Google 인증에 필요한 값이 없습니다.");
      }
      const { idToken } = await exchangeGoogleCode({
        code: params.code,
        redirectUri: params.redirectUri,
        codeVerifier: params.codeVerifier,
      });
      return verifyGoogleIdToken(idToken, params.nonce);
    }
    case "kakao": {
      const { accessToken } = await exchangeKakaoCode({
        code: params.code,
        redirectUri: params.redirectUri,
      });
      return fetchKakaoProfile(accessToken);
    }
    case "naver": {
      if (!params.state) {
        throw new Error("네이버 인증에 필요한 값이 없습니다.");
      }
      const { accessToken } = await exchangeNaverCode({
        code: params.code,
        state: params.state,
        redirectUri: params.redirectUri,
      });
      return fetchNaverProfile(accessToken);
    }
  }
}
