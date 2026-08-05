import { prisma } from "@/lib/prisma";
import { deleteProjectFiles, isStorageConfigured } from "@/lib/storage";

export type DeleteProjectResult =
  | { status: 200; id: string }
  | { status: 404 }
  | { status: 502 }
  | { status: 503 };

/**
 * 프로젝트와 연결된 문서를 함께 지운다.
 *
 * 외부 스토리지(Vercel Blob)와 DB는 하나의 트랜잭션으로 묶을 수 없다. 그래서
 * Blob을 먼저 지우고, 전부 성공했거나 애초에 지울 문서가 없을 때만 DB
 * 레코드를 지운다. Blob 삭제가 일부라도 실패하면 DB의 Document.storageKey를
 * 남겨 재시도할 근거를 보존한다(레코드를 먼저 지우면 재시도 경로 자체가
 * 사라진다).
 */
export async function deleteProjectWithDocuments({
  projectId,
  userId,
}: {
  projectId: string;
  userId: string;
}): Promise<DeleteProjectResult> {
  // 소유권과 연결 문서를 한 번에 조회한다. 남의 프로젝트든 존재하지 않는
  // 프로젝트든 동일하게 404로 응답해 존재 여부를 노출하지 않는다.
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId },
    select: { documents: { select: { storageKey: true } } },
  });
  if (!project) return { status: 404 };

  if (project.documents.length > 0 && !isStorageConfigured()) {
    return { status: 503 };
  }

  if (project.documents.length > 0) {
    const { failedCount, total } = await deleteProjectFiles(
      project.documents.map((doc) => doc.storageKey),
    );
    if (failedCount > 0) {
      console.error(
        `[projectDeletion] Blob 삭제 실패 ${failedCount}/${total}건 (projectId=${projectId})`,
      );
      return { status: 502 };
    }
  }

  const result = await prisma.project.deleteMany({
    where: { id: projectId, userId },
  });
  // Blob은 이미 지웠지만 그 사이 다른 요청이 먼저 DB 레코드를 지웠을 수 있다.
  // DB에 이미 없다는 뜻이라 404로 응답한다.
  if (result.count === 0) return { status: 404 };

  return { status: 200, id: projectId };
}
