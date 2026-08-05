import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { ProjectForm } from "@/components/app/ProjectForm";
import { ProjectDeleteControl } from "@/components/app/ProjectDeleteControl";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { findSubtype, type ProjectStage, type SpaceCategory } from "@/data/projectSpace";
import type { ProjectWizardValues } from "@/components/app/project-wizard/shared";

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

  // spaceSubtype 자체는 컬럼에 없고 한글 라벨(spaceType)만 저장돼 있어,
  // 라벨로 역추적한다. 이 마이그레이션 이전에 만든 프로젝트는 옛 4종
  // 고정값("주거"/"사무실"/"공장"/"기타")이 들어있어 못 찾을 수 있다 —
  // 그 경우 공간 유형을 다시 선택하도록 빈 값으로 시작한다.
  const recovered = findSubtype(project.spaceType);

  const initialValues: ProjectWizardValues = {
    spaceCategory: (project.spaceCategory as SpaceCategory | null) ?? recovered?.category ?? "",
    spaceSubtype: recovered?.value ?? "",
    addressPending: project.addressPending,
    address: project.address ?? "",
    addressDetail: "",
    unitNumber: "",
    transactionType: project.transactionType ?? "",
    details: (project.details as Record<string, string> | null) ?? {},
    projectStage: (project.projectStage as ProjectStage | null) ?? "",
    scheduleUndecided: project.scheduleUndecided,
    moveInDate: project.moveInDate
      ? project.moveInDate.toISOString().slice(0, 10)
      : "",
    contractDate: project.contractDate
      ? project.contractDate.toISOString().slice(0, 10)
      : "",
    name: project.name,
    budget: project.budget ?? "",
  };

  return (
    <AppShell
      title="프로젝트 수정"
      description="공간 유형, 거래 조건, 일정을 수정합니다."
      contentClassName="max-w-3xl"
    >
      <ProjectForm projectId={project.id} initialValues={initialValues} />

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
