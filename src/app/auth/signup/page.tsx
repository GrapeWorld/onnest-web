import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { SignupForm } from "@/components/app/SignupForm";
import { getCurrentUser } from "@/lib/auth";
import { sanitizeReturnTo } from "@/lib/oauth/returnTo";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;

  // 이미 로그인한 사용자가 회원가입 화면을 다시 열면 목적지로 바로 보낸다.
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect(sanitizeReturnTo(params.returnTo));
  }

  return (
    <AppShell
      title="회원가입"
      description="몇 가지 정보만 입력하면 온네스트를 바로 시작할 수 있어요."
      showNav={false}
    >
      <div className="mx-auto max-w-md">
        <Card>
          <SignupForm returnTo={params.returnTo} />
        </Card>
      </div>
    </AppShell>
  );
}
