import { notFound, redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { Button } from "@/components/ui/Button";
import { DocumentManager } from "@/components/app/DocumentManager";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isStorageConfigured } from "@/lib/storage";
import { formatDate } from "@/lib/dates";

export default async function DocumentsPage({
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
      documents: {
        // 파트너가 서비스 신청에 올린 내부 파일은 고객 본인의 문서함에
        // 보이면 안 된다 — 일반 문서함 파일(고객 본인 업로드)만 보여준다.
        where: { uploadedByRole: "CUSTOMER" },
        orderBy: { createdAt: "desc" },
        // url은 민감하므로 클라이언트로 내려보내지 않는다.
        select: {
          id: true,
          filename: true,
          mimeType: true,
          size: true,
          createdAt: true,
        },
      },
    },
  });
  if (!project) notFound();

  return (
    <CustomerAppShell
      title="문서함"
      description="계약서, 등기부, 입주 사진, 하자 확인 사진을 보관합니다."
      contentClassName="max-w-3xl"
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button href={`/projects/${project.id}`} variant="ghost">
          프로젝트 홈
        </Button>
        <Button href={`/projects/${project.id}/calendar`} variant="secondary">
          입주 일정
        </Button>
      </div>

      <DocumentManager
        projectId={project.id}
        storageReady={isStorageConfigured()}
        documents={project.documents.map((doc) => ({
          ...doc,
          createdAt: formatDate(doc.createdAt),
        }))}
      />
    </CustomerAppShell>
  );
}
