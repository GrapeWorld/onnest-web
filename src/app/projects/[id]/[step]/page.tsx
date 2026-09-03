import { notFound, redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { ProjectStepDetail } from "@/components/app/ProjectSteps";
import { getProjectStep } from "@/data/projectSteps";
import { getCurrentUser } from "@/lib/auth";
import { findOwnedProject, toStepStatusMap } from "@/lib/projects";

export default async function ProjectStepPage({
  params,
}: {
  params: Promise<{ id: string; step: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id, step: slug } = await params;
  const step = getProjectStep(slug);
  if (!step) notFound();

  const project = await findOwnedProject(id, user.id);
  if (!project) notFound();

  const status = toStepStatusMap(project.stepStates).get(slug) ?? "대기";
  const checkedItems = project.checks
    .filter((check) => check.stepSlug === slug && check.checked)
    .map((check) => check.label);

  return (
    <CustomerAppShell title={step.title} description={step.pageDescription}>
      <p className="mb-6 text-sm font-semibold text-ink/60">
        {project.name} · {project.spaceType}
      </p>
      <ProjectStepDetail
        step={step}
        projectId={project.id}
        status={status}
        checkedItems={checkedItems}
      />
    </CustomerAppShell>
  );
}
