import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/app/LogoutButton";
import { ServiceRequestList } from "@/components/app/ServiceRequestList";
import { DeleteAccountControl } from "@/components/app/DeleteAccountControl";
import { projectSteps } from "@/data/projectSteps";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { stepStates: true },
  });

  const totalDone = projects.reduce(
    (sum, project) =>
      sum + project.stepStates.filter((s) => s.status === "완료").length,
    0,
  );

  const documentCount = await prisma.document.count({
    where: { project: { userId: user.id } },
  });

  // 내 프로젝트에 속한 신청만 가져온다.
  const requests = await prisma.serviceRequest.findMany({
    where: { project: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    include: { project: { select: { name: true } } },
  });

  return (
    <AppShell
      title="마이페이지"
      description="내 프로젝트, 구독, 리포트, 문의 이력을 확인하는 사용자 대시보드입니다."
    >
      <div className="mb-6 flex items-center justify-between rounded-[24px] border border-forest/10 bg-white p-5 shadow-card">
        <div>
          <p className="text-sm text-ink/55">{user.email}</p>
          <p className="text-lg font-bold text-forest">{user.name}님</p>
        </div>
        <LogoutButton className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40 hover:shadow-card" />
      </div>

      <MetricGrid
        items={[
          ["내 프로젝트", `${projects.length}건`],
          ["완료한 단계", `${totalDone}건`],
          ["서비스 신청", `${requests.length}건`],
          ["구독 상태", "무료"],
        ]}
      />

      <div className="mb-4 mt-8 flex items-center justify-between">
        <h2 className="text-xl font-black text-forest">내 프로젝트</h2>
        <Button href="/projects/new">새 프로젝트</Button>
      </div>

      {projects.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">
            아직 만든 프로젝트가 없습니다.
          </p>
          <p className="mt-2 text-sm text-ink/60">
            집·사무실·공장 후보를 프로젝트로 만들어 입주 준비를 관리해보세요.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const done = project.stepStates.filter(
              (s) => s.status === "완료",
            ).length;
            const progress = Math.round((done / projectSteps.length) * 100);

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="h-full p-5">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-forest">
                      {project.spaceType}
                    </span>
                    <span className="text-xs font-bold text-sage">
                      {progress}%
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-black text-forest">
                    {project.name}
                  </h3>
                  <p className="mt-2 text-sm text-ink/60">
                    {project.address || "주소 미입력"}
                  </p>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-forest/10">
                    <div
                      className="h-full rounded-full bg-forest"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-3 text-xs text-ink/55">
                    입주 예정일:{" "}
                    {project.moveInDate
                      ? formatDate(project.moveInDate)
                      : "미정"}
                  </p>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black text-forest">
          서비스 신청 내역{" "}
          <span className="text-base font-bold text-sage">
            {requests.length}건
          </span>
        </h2>
        <ServiceRequestList
          requests={requests.map((request) => ({
            ...request,
            projectName: request.project.name,
          }))}
        />
      </section>

      <section className="mt-10">
        <DeleteAccountControl
          counts={{ projects: projects.length, documents: documentCount }}
        />
      </section>
    </AppShell>
  );
}
