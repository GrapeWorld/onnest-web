import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { OAuthSignupCompleteForm } from "@/components/app/OAuthSignupCompleteForm";
import { getOAuthSession } from "@/lib/oauth/session";
import { oauthProviderLabels } from "@/data/oauthProviders";

export default async function OAuthCompletePage() {
  const oauthSession = await getOAuthSession();
  const profile = oauthSession.pendingProfile;

  if (!profile || !profile.email) {
    redirect("/auth/login?oauthError=expired");
  }

  return (
    <AppShell
      title="소셜 회원가입 완료"
      description={`${oauthProviderLabels[profile.provider]} 계정 정보로 온네스트 회원가입을 완료합니다.`}
      showNav={false}
    >
      <div className="mx-auto max-w-md">
        <Card>
          <OAuthSignupCompleteForm email={profile.email} name={profile.name ?? ""} />
        </Card>
      </div>
    </AppShell>
  );
}
