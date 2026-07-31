import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ProjectForm } from "@/components/app/ProjectForm";
import { ProjectDeleteControl } from "@/components/app/ProjectDeleteControl";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: {
      handover: { select: { id: true } },
      _count: { select: { stepStates: true, events: true, requests: true } },
    },
  });
  if (!project) notFound();

  return (
    <AppShell
      title="프로젝트 수정"
      description="프로젝트 이름, 공간 유형, 주소, 입주 예정일, 예산 범위를 수정합니다."
      contentClassName="max-w-3xl"
    >
      <ProjectForm
        projectId={project.id}
        initialValues={{
          name: project.name,
          spaceType: project.spaceType,
          address: project.address ?? "",
          moveInDate: project.moveInDate
            ? project.moveInDate.toISOString().slice(0, 10)
            : "",
          budget: project.budget ?? "",
        }}
      />

      <div className="mt-10">
        <ProjectDeleteControl
          projectId={project.id}
          projectName={project.name}
          counts={{
            steps: project._count.stepStates,
            events: project._count.events,
            requests: project._count.requests,
            handover: Boolean(project.handover),
          }}
        />
      </div>
    </AppShell>
  );
}
