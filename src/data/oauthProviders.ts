// 로그인 버튼 노출 순서(기획 요구사항): 카카오 → 네이버 → Google.
export const oauthProviders = ["kakao", "naver", "google"] as const;
export type OAuthProvider = (typeof oauthProviders)[number];

export const oauthProviderLabels: Record<OAuthProvider, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "Google",
};

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (oauthProviders as readonly string[]).includes(value);
}
