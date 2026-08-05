import type { OAuthProvider } from "@/data/oauthProviders";

function readEnv(provider: OAuthProvider) {
  switch (provider) {
    case "google":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      };
    case "kakao":
      return {
        clientId: process.env.KAKAO_CLIENT_ID,
        clientSecret: process.env.KAKAO_CLIENT_SECRET,
      };
    case "naver":
      return {
        clientId: process.env.NAVER_CLIENT_ID,
        clientSecret: process.env.NAVER_CLIENT_SECRET,
      };
  }
}

/** 환경변수가 설정된 provider만 로그인 버튼·start 라우트에서 노출한다. */
export function isProviderConfigured(provider: OAuthProvider) {
  const env = readEnv(provider);
  return Boolean(env.clientId && env.clientSecret);
}

export function getProviderCredentials(provider: OAuthProvider) {
  const env = readEnv(provider);
  if (!env.clientId || !env.clientSecret) {
    throw new Error(`${provider} OAuth 환경변수가 설정되지 않았습니다.`);
  }
  return { clientId: env.clientId, clientSecret: env.clientSecret };
}
