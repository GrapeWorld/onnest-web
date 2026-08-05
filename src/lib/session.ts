import { cookies } from "next/headers";
import { getIronSession, type SessionOptions } from "iron-session";

export type SessionData = {
  userId?: string;
  authVersion?: number;
  // 소셜 전용 회원의 탈퇴 재인증 성공 시각(epoch ms). 짧은 시간 안에만
  // 유효하며(src/app/api/auth/delete-account/route.ts에서 검사), 계정
  // 삭제 자체를 이 값만으로 수행하지 않는다 — 탈퇴 요청 자체는 여전히
  // 별도로 받는다.
  deleteApprovedAt?: number;
};

const secret = process.env.SESSION_SECRET;
if (!secret || secret.length < 32) {
  throw new Error(
    "SESSION_SECRET must be set to a string of at least 32 characters (see .env.example).",
  );
}

export const sessionOptions: SessionOptions = {
  cookieName: "onnest_session",
  password: secret,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
