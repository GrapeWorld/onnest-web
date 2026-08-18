import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/app/LoginForm";
import { SocialLoginButtons } from "@/components/app/SocialLoginButtons";
import { oauthProviders } from "@/data/oauthProviders";
import { isProviderConfigured } from "@/lib/oauth/providers";
import { getOAuthErrorMessage } from "@/lib/oauth/errors";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeReturnTo } from "@/lib/oauth/returnTo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauthError?: string; returnTo?: string }>;
}) {
  const params = await searchParams;

  // 이미 로그인한 사용자가 로그인 화면을 다시 열면 목적지로 바로 보낸다.
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(sanitizeReturnTo(params.returnTo));
  }

  const errorMessage = getOAuthErrorMessage(params.oauthError);
  const configuredProviders = oauthProviders.filter((provider) =>
    isProviderConfigured(provider),
  );

  return (
    <AppShell
      title="로그인"
      description="이메일과 비밀번호 또는 소셜 계정으로 온네스트에 로그인하세요."
      showNav={false}
    >
      <div className="mx-auto max-w-md">
        <Card>
          {errorMessage && (
            <p
              role="alert"
              className="mb-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
            >
              {errorMessage}
            </p>
          )}

          <LoginForm returnTo={params.returnTo} />

          <div className="mt-6">
            <SocialLoginButtons
              configuredProviders={configuredProviders}
              returnTo={params.returnTo}
            />
          </div>

          <p className="mt-4 text-center text-sm text-ink/60">
            <Link
              href="/auth/find-id"
              className="font-semibold text-forest hover:underline"
            >
              아이디 찾기
            </Link>
            {" · "}
            <Link
              href="/auth/forgot-password"
              className="font-semibold text-forest hover:underline"
            >
              비밀번호 찾기
            </Link>
          </p>
          <p className="mt-6 text-center text-sm text-ink/60">
            아직 계정이 없으신가요?{" "}
            <Link
              href="/auth/signup"
              className="font-semibold text-forest hover:underline"
            >
              회원가입
            </Link>
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
