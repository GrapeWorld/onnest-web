import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { CandidatePropertyForm } from "@/components/app/CandidatePropertyForm";
import { getCurrentUser } from "@/lib/auth";

export default async function NewCandidatePropertyPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <AppShell
      title="매물 후보 추가"
      description="외부 사이트에서 확인한 매물 정보를 직접 입력해 저장합니다."
    >
      <CandidatePropertyForm mode="create" />
    </AppShell>
  );
}
