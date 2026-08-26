import { prisma } from "@/lib/prisma";

/**
 * 고객 대상 필드만 고른다. adminMemo·sharedById·sharedByName·sharedByEmail은
 * 관리자 전용이라 절대 포함하지 않는다. API 라우트와 서버 컴포넌트(프로젝트
 * 상세 페이지)가 이 정의를 공유해 필드 목록이 두 곳에서 어긋나지 않게 한다.
 */
export const customerPropertySuggestionSelect = {
  id: true,
  projectId: true,
  sourceUrl: true,
  title: true,
  address: true,
  transactionType: true,
  price: true,
  deposit: true,
  monthlyRent: true,
  area: true,
  roomCount: true,
  availableDate: true,
  sharedReason: true,
  cautionNote: true,
  customerStatus: true,
  customerMemo: true,
  viewedAt: true,
  respondedAt: true,
  savedCandidatePropertyId: true,
  createdAt: true,
} as const;

/**
 * NOTE: 예전에는 이 목록 조회 자체가 부수효과로 NEW를 VIEWED로 전환했지만,
 * Next.js의 Link 프리페치가 같은 프로젝트 상세 페이지를 백그라운드에서
 * 미리 렌더링하면서 이 조회 함수를 경합적으로 여러 번 호출해(요청마다
 * 매번 "현재 DB 상태"를 다시 읽으므로 멱등하지 않다) "새로 공유됨" 배지가
 * 실제로는 한 번도 안 보인 채 곧바로 사라지는 문제가 있었다. 지금은 순수
 * 읽기만 하고, NEW→VIEWED 전환은 고객이 실제로 응답(관심 있음/보류/관심
 * 없음)하거나 저장할 때만 일어난다 — "새로 공유됨" 배지는 고객이 명시적으로
 * 반응하기 전까지 계속 보인다.
 */
function countNew(suggestions: { customerStatus: string }[]) {
  return suggestions.filter((item) => item.customerStatus === "NEW").length;
}

/** 특정 프로젝트에 공유된 매물 목록. 다른 고객의 프로젝트 id를 넣으면 항상 빈 배열이다. */
export async function listProjectPropertySuggestions(projectId: string, userId: string) {
  const items = await prisma.projectPropertySuggestion.findMany({
    where: { projectId, project: { userId }, withdrawnAt: null },
    orderBy: { createdAt: "desc" },
    select: customerPropertySuggestionSelect,
  });
  return { items, newCount: countNew(items) };
}

/**
 * 공유 매물 단건 조회(소유권 검증 포함). "내 매물 후보에 저장" 화면에서
 * 기존 매물 등록 폼을 미리 채우는 용도로 쓴다 — 관리자 전용 필드는 포함하지 않는다.
 */
export async function getCustomerPropertySuggestion(id: string, userId: string) {
  return prisma.projectPropertySuggestion.findFirst({
    where: { id, project: { userId }, withdrawnAt: null },
    select: customerPropertySuggestionSelect,
  });
}

/** 이 고객의 모든 프로젝트에 공유된 매물 목록(마이페이지 집계용). 프로젝트명도 함께 돌려준다. */
export async function listAllCustomerPropertySuggestions(userId: string) {
  const items = await prisma.projectPropertySuggestion.findMany({
    where: { project: { userId }, withdrawnAt: null },
    orderBy: { createdAt: "desc" },
    select: { ...customerPropertySuggestionSelect, project: { select: { id: true, name: true } } },
  });
  return { items, newCount: countNew(items) };
}
