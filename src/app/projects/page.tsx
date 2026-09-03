import { redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProjectCard } from "@/components/app/ProjectCard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 고객 앱 내비게이션의 "프로젝트" 탭 목적지. 지금까지는 /my에만 인라인으로 있던 목록을 별도 화면으로 뺐다 — 조회 로직은 그대로다. */
export default async function ProjectsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { stepStates: true },
  });

  return (
    <CustomerAppShell
      title="내 프로젝트"
      description="만든 입주 프로젝트의 준비 단계와 일정을 확인합니다."
    >
      <div className="mb-6">
        <Button href="/projects/new">새 프로젝트</Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">아직 만든 프로젝트가 없습니다.</p>
          <p className="mt-2 text-sm text-ink/60">
            집·사무실·공장 후보를 프로젝트로 만들어 입주 준비를 관리해보세요.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </CustomerAppShell>
  );
}
