import { jwtVerify, createRemoteJWKSet } from "jose";
import { getProviderCredentials } from "./providers";
import { createCodeChallenge } from "./pkce";
import type { NormalizedProfile } from "./types";

const AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
// Google의 공개 서명 키 집합. jose가 알아서 캐싱·재조회한다 — 직접 파싱하지 않는다.
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

export function buildGoogleAuthorizationUrl({
  redirectUri,
  state,
  codeVerifier,
  nonce,
}: {
  redirectUri: string;
  state: string;
  codeVerifier: string;
  nonce: string;
}) {
  const { clientId } = getProviderCredentials("google");
  const url = new URL(AUTHORIZATION_ENDPOINT);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile email");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  url.searchParams.set("code_challenge", createCodeChallenge(codeVerifier));
  url.searchParams.set("code_challenge_method", "S256");
  return url;
}

/** 인가 코드를 토큰으로 교환한다. ID Token 검증은 별도 함수에서 한다. */
export async function exchangeGoogleCode({
  code,
  redirectUri,
  codeVerifier,
}: {
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const { clientId, clientSecret } = getProviderCredentials("google");
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    client_secret: clientSecret,
    code_verifier: codeVerifier,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error("Google 토큰 교환에 실패했습니다.");
  }
  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) {
    throw new Error("Google 응답에 id_token이 없습니다.");
  }
  return { idToken: data.id_token };
}

/**
 * ID Token 서명(JWKS)·issuer·audience·만료를 jose가 검증한다. nonce는
 * OIDC 확장 클레임이라 jose에 내장 옵션이 없어 별도로 비교한다 — 위조된
 * ID Token은 서명 검증 단계에서 이미 걸러지므로 nonce는 재생 공격만 막는다.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedNonce: string,
): Promise<NormalizedProfile> {
  const { clientId } = getProviderCredentials("google");
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: clientId,
  });

  if (typeof payload.nonce !== "string" || payload.nonce !== expectedNonce) {
    throw new Error("Google ID Token의 nonce가 일치하지 않습니다.");
  }
  if (typeof payload.sub !== "string") {
    throw new Error("Google ID Token에 sub 클레임이 없습니다.");
  }

  return {
    provider: "google",
    providerAccountId: payload.sub,
    email: typeof payload.email === "string" ? payload.email : null,
    emailVerified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : null,
    profileImage: typeof payload.picture === "string" ? payload.picture : null,
  };
}
