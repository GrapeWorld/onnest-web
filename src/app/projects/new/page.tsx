import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ProjectForm } from "@/components/app/ProjectForm";
import { getCurrentUser } from "@/lib/auth";

export default async function NewProjectPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  return (
    <AppShell
      title="새 입주 프로젝트 만들기"
      description="집·사무실·공장 후보를 저장하고 입주 예정일, 확인 항목, 문서함을 하나의 프로젝트로 묶습니다."
      contentClassName="max-w-3xl"
    >
      <ProjectForm />
    </AppShell>
  );
}
