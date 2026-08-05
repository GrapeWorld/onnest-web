import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";
import type { OAuthProvider } from "@/data/oauthProviders";
import type { NormalizedProfile } from "./types";

export type OAuthMode = "login" | "link" | "delete-confirm";

/**
 * OAuth 흐름 전용 단기 세션. 기존 onnest_session(실제 로그인 세션)과는
 * 별도 쿠키를 쓴다 — 인가 진행 중 상태를 로그인 세션과 섞지 않기 위해서다.
 */
export type OAuthSessionData = {
  provider?: OAuthProvider;
  mode?: OAuthMode;
  state?: string;
  codeVerifier?: string;
  nonce?: string;
  returnTo?: string;
  // "link"·"delete-confirm" 모드에서만 쓴다 — 이미 로그인한 사용자가 시작한
  // 흐름이라는 뜻이다. 로그인/가입 흐름(mode: "login")에서는 비워 둔다.
  actingUserId?: string;
  // callback이 신규 사용자로 판별한 뒤, 가입 완료 페이지로 넘기기 전까지
  // 검증된 프로필을 잠깐 들고 있는다.
  pendingProfile?: NormalizedProfile;
};

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set to a string of at least 32 characters (see .env.example).",
  );
}

export const oauthSessionOptions: SessionOptions = {
  cookieName: "onnest_oauth",
  password: secret,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    // 인가 코드 왕복에 필요한 짧은 시간만 유지한다.
    maxAge: 60 * 10,
  },
};

export async function getOAuthSession() {
  return getIronSession<OAuthSessionData>(await cookies(), oauthSessionOptions);
}
