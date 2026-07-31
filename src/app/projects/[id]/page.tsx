import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { ProjectStepGrid } from "@/components/app/ProjectSteps";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { projectSteps } from "@/data/projectSteps";
import { getCurrentUser } from "@/lib/auth";
import { findOwnedProject, toStepStatusMap } from "@/lib/projects";
import { formatDate, formatDDay, daysUntil } from "@/lib/dates";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const project = await findOwnedProject(id, user.id);
  if (!project) notFound();

  const statusBySlug = toStepStatusMap(project.stepStates);
  const done = projectSteps.filter(
    (step) => statusBySlug.get(step.slug) === "완료",
  ).length;
  const inProgress = projectSteps.filter(
    (step) => statusBySlug.get(step.slug) === "진행 중",
  ).length;
  const progress = Math.round((done / projectSteps.length) * 100);

  // 아직 완료하지 않은 앞으로의 일정 3건만 요약해 보여준다.
  const upcomingEvents = project.events
    .filter((event) => !event.done && daysUntil(event.date) >= 0)
    .slice(0, 3);

  return (
    <AppShell
      title={project.name}
      description={`${project.spaceType} · ${project.address || "주소 미입력"}`}
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button href={`/projects/${project.id}/handover`}>인수인계서</Button>
        <Button href={`/projects/${project.id}/edit`} variant="ghost">
          프로젝트 수정
        </Button>
        <Button href={`/projects/${project.id}/calendar`} variant="secondary">
          입주 일정
        </Button>
        <Button href={`/projects/${project.id}/services`} variant="secondary">
          서비스 연결
        </Button>
        <Button href={`/projects/${project.id}/documents`} variant="ghost">
          문서함
        </Button>
      </div>

      <MetricGrid
        items={[
          ["진행률", `${progress}%`],
          ["완료 단계", `${done}/${projectSteps.length}`],
          ["진행 중", `${inProgress}건`],
          [
            "입주 예정일",
            project.moveInDate ? formatDate(project.moveInDate) : "미정",
          ],
        ]}
      />

      <div className="mt-6 rounded-[24px] border border-forest/10 bg-white p-6 shadow-card">
        <div className="flex items-center justify-between text-sm font-bold text-forest">
          <span>전체 진행률</span>
          <span>
            {done}/{projectSteps.length} 단계 완료
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-forest/10">
          <div
            className="h-full rounded-full bg-forest transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        {project.budget && (
          <p className="mt-4 text-sm text-ink/60">
            예산 범위: {project.budget}
          </p>
        )}
      </div>

      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black text-forest">다가오는 일정</h2>
          <Link
            href={`/projects/${project.id}/calendar`}
            className="text-sm font-semibold text-forest hover:underline"
          >
            전체 보기
          </Link>
        </div>
        {upcomingEvents.length === 0 ? (
          <Card className="p-6 text-sm text-ink/60">
            등록된 일정이 없습니다. 계약일, 전입신고, 확정일자처럼 놓치면 안
            되는 날짜를{" "}
            <Link
              href={`/projects/${project.id}/calendar`}
              className="font-semibold text-forest hover:underline"
            >
              일정에 추가
            </Link>
            해보세요.
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {upcomingEvents.map((event) => (
              <Card key={event.id} className="p-5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">
                    {formatDDay(event.date)}
                  </span>
                </div>
                <p className="mt-4 font-bold text-forest">{event.title}</p>
                <p className="mt-1 text-sm text-ink/60">
                  {formatDate(event.date)}
                </p>
              </Card>
            ))}
          </div>
        )}
      </section>

      <h2 className="mb-4 mt-8 text-xl font-black text-forest">입주 10단계</h2>
      <ProjectStepGrid projectId={project.id} statusBySlug={statusBySlug} />

      <p className="mt-8 text-sm text-ink/55">
        각 단계를 열어 진행 상태를 저장할 수 있습니다.{" "}
        <Link href="/my" className="font-semibold text-forest hover:underline">
          내 프로젝트 목록
        </Link>
      </p>
    </AppShell>
  );
}
