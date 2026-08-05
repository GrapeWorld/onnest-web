import type { OAuthProvider } from "@/data/oauthProviders";

/** 각 provider 응답을 공통 형태로 정규화한 것. */
export type NormalizedProfile = {
  provider: OAuthProvider;
  providerAccountId: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  profileImage: string | null;
};
