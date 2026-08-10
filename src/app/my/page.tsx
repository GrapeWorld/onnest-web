import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LogoutButton } from "@/components/app/LogoutButton";
import { ServiceRequestList } from "@/components/app/ServiceRequestList";
import { DeleteAccountControl } from "@/components/app/DeleteAccountControl";
import { SocialAccountsPanel } from "@/components/app/SocialAccountsPanel";
import { projectSteps } from "@/data/projectSteps";
import { oauthProviders, type OAuthProvider } from "@/data/oauthProviders";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { getSession } from "@/lib/session";
import { isProviderConfigured } from "@/lib/oauth/providers";
import { isDeleteApproved } from "@/lib/oauth/deleteApproval";

export default async function MyPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/auth/login");
  }

  const socialAccounts = await prisma.socialAccount.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, provider: true, providerEmail: true },
  });
  const configuredProviders = oauthProviders.filter((provider) =>
    isProviderConfigured(provider),
  );

  const session = await getSession();
  const deleteApproved = isDeleteApproved(session.deleteApprovedAt);

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
    include: {
      project: { select: { name: true } },
      quotes: { orderBy: { createdAt: "asc" } },
    },
  });

  const inquiryCount = await prisma.inquiry.count({ where: { userId: user.id } });

  const activeProject = projects.find((project) => {
    const done = project.stepStates.filter((s) => s.status === "완료").length;
    return done < projectSteps.length;
  });

  const nextAction =
    projects.length === 0
      ? {
          title: "첫 입주 프로젝트를 만들어보세요",
          description: "관심 있는 집·사무실·공장을 프로젝트로 저장하면 준비 일정과 서비스 연결을 한곳에서 관리할 수 있습니다.",
          href: "/projects/new",
          label: "새 프로젝트 만들기",
        }
      : activeProject
        ? {
            title: `"${activeProject.name}" 준비를 이어가세요`,
            description: "진행 중인 단계를 확인하고 다음 할 일을 이어서 처리할 수 있습니다.",
            href: `/projects/${activeProject.id}`,
            label: "프로젝트 이어서 보기",
          }
        : {
            title: "모든 프로젝트의 준비 단계를 완료했습니다",
            description: "새로운 공간을 준비 중이라면 프로젝트를 추가로 만들어보세요.",
            href: "/projects/new",
            label: "새 프로젝트 만들기",
          };

  return (
    <AppShell
      title="마이페이지"
      description="내 프로젝트, 구독, 리포트, 문의 이력을 확인하는 사용자 대시보드입니다."
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-forest/10 bg-white p-5 shadow-card">
        <div>
          <p className="text-sm text-ink/55">{user.email}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="text-lg font-bold text-forest">{user.name}님</p>
            <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-forest">
              무료 플랜
            </span>
          </div>
        </div>
        <LogoutButton className="rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40 hover:shadow-card" />
      </div>

      <div className="mb-6 flex flex-col gap-3 rounded-[24px] bg-forest p-6 text-white shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold text-mint">다음 할 일</p>
          <h2 className="mt-1 text-xl font-black">{nextAction.title}</h2>
          <p className="mt-2 text-sm leading-6 text-white/75">
            {nextAction.description}
          </p>
        </div>
        <Button href={nextAction.href} className="shrink-0 bg-white text-forest hover:bg-mint">
          {nextAction.label}
        </Button>
      </div>

      {user.memberType === "PARTNER" && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-forest/10 bg-white p-5 shadow-card">
          <div>
            <p className="text-sm font-bold text-forest">업체 파트너 계정으로 등록되어 있습니다</p>
            <p className="mt-1 text-sm text-ink/60">
              업체로 받은 서비스 요청과 팀 관리는 파트너 포털에서 확인할 수 있습니다.
            </p>
          </div>
          <Button href="/partner" variant="secondary">
            파트너 포털로 이동
          </Button>
        </div>
      )}

      <MetricGrid
        items={[
          ["내 프로젝트", `${projects.length}건`],
          ["완료한 단계", `${totalDone}건`],
          ["서비스 신청", `${requests.length}건`],
          ["내 문의", `${inquiryCount}건`],
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
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-forest/10 bg-white p-5 shadow-card">
          <div>
            <h2 className="text-xl font-black text-forest">내 문의</h2>
            <p className="mt-1 text-sm text-ink/60">
              보낸 문의의 진행 상황과 답변을 확인하고, 추가로 질문할 수 있습니다.
            </p>
          </div>
          <Button href="/my/inquiries">내 문의 보기</Button>
        </div>
      </section>

      <section className="mt-10">
        <div className="rounded-[24px] border border-forest/10 bg-white p-5 shadow-card">
          <h2 className="text-xl font-black text-forest">로그인 방법</h2>
          <p className="mt-1 text-sm text-ink/60">
            비밀번호와 연결된 소셜 계정을 확인·관리합니다.
          </p>
          <div className="mt-4">
            <SocialAccountsPanel
              connections={socialAccounts.map((account) => ({
                id: account.id,
                provider: account.provider as OAuthProvider,
                providerEmail: account.providerEmail,
              }))}
              hasPassword={Boolean(user.passwordHash)}
              configuredProviders={configuredProviders}
            />
          </div>
        </div>
      </section>

      <section className="mt-10">
        <DeleteAccountControl
          counts={{ projects: projects.length, documents: documentCount }}
          hasPassword={Boolean(user.passwordHash)}
          connections={socialAccounts.map((account) => ({
            provider: account.provider as OAuthProvider,
          }))}
          deleteApproved={deleteApproved}
        />
      </section>
    </AppShell>
  );
}
