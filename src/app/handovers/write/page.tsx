import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * 인수인계서는 프로젝트에 속하므로 단독 작성 화면이 없다.
 * 마케팅 페이지의 "인수인계서 작성해보기" 진입점을 실제 작성 화면으로 넘겨준다.
 */
export default async function HandoverWriteEntryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const project = await prisma.project.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!project) redirect("/projects/new");
  redirect(`/projects/${project.id}/handover/write`);
}
