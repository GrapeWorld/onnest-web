import { prisma } from "@/lib/prisma";

/**
 * 로그인한 사용자가 소유한 프로젝트만 돌려준다.
 * userId를 where에 함께 넣어 남의 프로젝트는 애초에 조회되지 않게 한다.
 */
export function findOwnedProject(projectId: string, userId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, userId },
    include: {
      stepStates: true,
      checks: true,
      events: { orderBy: { date: "asc" } },
    },
  });
}

/** 단계 상태를 slug -> status 맵으로 변환한다. 저장된 적 없는 단계는 "대기". */
export function toStepStatusMap(
  stepStates: { slug: string; status: string }[],
) {
  return new Map(stepStates.map((state) => [state.slug, state.status]));
}
