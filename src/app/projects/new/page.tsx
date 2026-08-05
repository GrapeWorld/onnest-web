import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ProjectWizard } from "@/components/app/project-wizard/ProjectWizard";
import { getCurrentUser } from "@/lib/auth";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <AppShell
      title="새 입주 프로젝트 만들기"
      description="공간 유형과 현재 준비 단계를 선택하면, 온네스트가 필요한 확인 항목과 입주 일정을 맞춤 구성합니다."
      contentClassName="max-w-3xl"
    >
      <ProjectWizard />
    </AppShell>
  );
}
