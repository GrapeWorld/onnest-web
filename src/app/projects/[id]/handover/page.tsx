import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { HandoverModerationStatus } from "@/components/app/HandoverModerationStatus";
import { HandoverShareControl } from "@/components/app/HandoverShareControl";
import { HandoverView } from "@/components/app/HandoverView";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectHandoverPage({
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

  const handover = project.handover;

  return (
    <AppShell
      title="우리집 인수인계서"
      description={`${project.name} · 다음 사용자에게 남길 생활 정보입니다.`}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button href={`/projects/${project.id}/handover/write`}>
          {handover ? "수정하기" : "작성하기"}
        </Button>
        <Button href={`/projects/${project.id}`} variant="ghost">
          프로젝트 홈
        </Button>
      </div>

      {handover ? (
        <div className="grid gap-5">
          <HandoverModerationStatus
            status={handover.moderationStatus}
            reason={handover.moderationReason}
          />
          <HandoverShareControl
            projectId={project.id}
            shared={handover.visibility === "link"}
            shareToken={handover.shareToken}
          />
          <HandoverView summary={handover.summary} items={handover.items} />
        </div>
      ) : (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">
            아직 남긴 생활 정보가 없습니다.
          </p>
          <p className="mt-2 text-sm text-ink/60">
            채광, 환기, 결로처럼 살아보지 않으면 모르는 정보를 남겨보세요.
          </p>
        </Card>
      )}
    </AppShell>
  );
}
