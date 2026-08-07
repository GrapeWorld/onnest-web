import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "@/components/app/LoginForm";
import { SocialLoginButtons } from "@/components/app/SocialLoginButtons";
import { oauthProviders } from "@/data/oauthProviders";
import { isProviderConfigured } from "@/lib/oauth/providers";
import { getOAuthErrorMessage } from "@/lib/oauth/errors";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ oauthError?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
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

          <SocialLoginButtons configuredProviders={configuredProviders} returnTo={params.returnTo} />

          <LoginForm returnTo={params.returnTo} />

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
