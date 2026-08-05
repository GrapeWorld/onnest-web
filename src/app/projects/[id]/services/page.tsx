import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { ServiceRequestForm } from "@/components/app/ServiceRequestForm";
import { ServiceRequestList } from "@/components/app/ServiceRequestList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ProjectServicesPage({
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
      requests: {
        orderBy: { createdAt: "desc" },
        include: { quotes: { orderBy: { createdAt: "asc" } } },
      },
    },
  });
  if (!project) notFound();

  return (
    <AppShell
      title="입주 서비스 연결"
      description="이사, 청소, 인터넷, 보수 등 입주 일정에 맞춰 필요한 서비스를 신청합니다."
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button href={`/projects/${project.id}`} variant="ghost">
          프로젝트 홈
        </Button>
        <Button href={`/projects/${project.id}/calendar`} variant="secondary">
          입주 일정
        </Button>
      </div>

      <ServiceRequestForm
        projectId={project.id}
        defaultRegion={project.address ?? ""}
        defaultName={user.name}
        defaultPhone={user.phone ?? ""}
      />

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black text-forest">
          신청 내역{" "}
          <span className="text-base font-bold text-sage">
            {project.requests.length}건
          </span>
        </h2>
        <ServiceRequestList requests={project.requests} />
      </section>
    </AppShell>
  );
}
