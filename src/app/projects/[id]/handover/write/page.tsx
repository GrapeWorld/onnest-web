import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { HandoverForm } from "@/components/app/HandoverForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function HandoverWritePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { handover: { include: { items: true } } },
  });
  if (!project) notFound();

  const initialNotes = Object.fromEntries(
    (project.handover?.items ?? []).map((item) => [item.label, item.note]),
  );

  return (
    <AppShell
      title="우리집 인수인계서 작성"
      description="3분이면 작성할 수 있습니다. 사람 평가가 아니라 공간과 생활 경험을 남깁니다."
    >
      <div className="max-w-4xl">
        <HandoverForm
          projectId={project.id}
          initialSummary={project.handover?.summary ?? ""}
          initialNotes={initialNotes}
        />
      </div>
    </AppShell>
  );
}
