import type { Metadata } from "next";
import { ResetPasswordForm } from "./ResetPasswordForm";

// 재설정 토큰이 담긴 URL이라 검색엔진에 올라가면 안 된다.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={token ?? null} />;
}
