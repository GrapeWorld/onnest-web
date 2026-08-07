import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { PartnerRole } from "@/data/partnerRole";

/** memberType이 PARTNER이고 실제로 연결된 업체가 있는지 확인한다. */
export function isPartnerStaff(user: {
  memberType: string;
  partnerId: string | null;
}): user is typeof user & { partnerId: string } {
  return user.memberType === "PARTNER" && Boolean(user.partnerId);
}

export type ActiveMembership = {
  id: string;
  partnerId: string;
  role: PartnerRole;
};

/**
 * 로그인한 사용자의 활성 파트너 멤버십을 조회한다. User.status가
 * ACTIVE가 아니거나(정지·탈퇴) Partner.active가 false거나(업체 비활성화)
 * PartnerMembership이 ACTIVE가 아니면(해제·정지) null을 반환한다 —
 * memberType/partnerId만으로는 이 세 가지 중 무엇도 걸러지지 않으므로,
 * 파트너 포털의 모든 권한 판단(아래 함수들 전부)이 이 함수 하나만 거치면
 * 자동으로 비활성 차단 혜택을 받는다.
 */
export async function getActiveMembership(user: {
  id: string;
  status: string;
  memberType: string;
  partnerId: string | null;
}): Promise<ActiveMembership | null> {
  if (!isPartnerStaff(user) || user.status !== "ACTIVE") return null;
  const membership = await prisma.partnerMembership.findFirst({
    where: { partnerId: user.partnerId, userId: user.id, status: "ACTIVE" },
    select: { id: true, partnerId: true, role: true, partner: { select: { active: true } } },
  });
  if (!membership || !membership.partner.active) return null;
  return { id: membership.id, partnerId: membership.partnerId, role: membership.role as PartnerRole };
}

/**
 * 파트너 포털 페이지에서 쓰는 가드. requireAdmin()과 같은 원칙 —
 * 로그인 안 했으면 로그인 화면으로, 업체 직원이 아니거나 활성 멤버십이
 * 없으면(비활성 계정·업체·멤버십 포함) 포털의 존재를 드러내지 않고
 * 홈으로 보낸다. 목록·상세 화면처럼 역할별로 UI를 분기해야 하는
 * 페이지는 멤버십도 함께 필요하므로 requirePartnerMembership()을 쓴다.
 */
export async function requirePartnerStaff() {
  const { user } = await requirePartnerMembership();
  return user;
}

export async function requirePartnerMembership() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (!isPartnerStaff(user)) redirect("/");
  const membership = await getActiveMembership(user);
  if (!membership) redirect("/");
  return { user, membership };
}

/**
 * 팀 관리·업체 정보 화면(페이지) 전용 가드 — 대표(OWNER)만 들어올 수
 * 있다. redirect()를 쓰므로 **페이지 컴포넌트에서만** 쓴다 — API
 * 라우트에서는 Route Handler 안에서 redirect()가 JSON 403이 아니라 실제
 * HTTP 리다이렉트 응답을 만들어버려 클라이언트의 fetch가 JSON을 못
 * 받는다. API 라우트는 getActiveOwnerMembership()을 쓴다.
 */
export async function requirePartnerOwner() {
  const { user, membership } = await requirePartnerMembership();
  if (membership.role !== "OWNER") redirect("/partner");
  return { user, membership };
}

/**
 * 팀 관리 관련 API 라우트 전용 — 페이지 가드와 달리 리다이렉트하지 않고
 * null을 반환한다. 호출부가 직접 401/403 JSON 응답을 만든다(이 저장소의
 * 모든 API 라우트가 따르는 관례).
 */
export async function getActiveOwnerMembership(user: {
  id: string;
  status: string;
  memberType: string;
  partnerId: string | null;
}) {
  const membership = await getActiveMembership(user);
  if (!membership || membership.role !== "OWNER") return null;
  return membership;
}

export type ServiceRequestPermissionResult =
  | { ok: false; reason: "notfound" } // 다른 업체 소속이거나, STAFF가 담당하지 않은 건 — 존재를 숨긴다
  | { ok: false; reason: "forbidden" } // 같은 업체 소속이고 조회는 가능하지만 이 동작은 역할상 불가(VIEWER 등)
  | { ok: true; role: PartnerRole; isAssignedStaff: boolean };

type ServiceRequestRef = { partnerId: string | null; partnerStaffId: string | null };

/**
 * 서비스 요청 쓰기 동작(상태 변경·메모·연락·견적·파일)의 권한을 판단하는
 * 순수 함수. 이미 조회해 둔 활성 멤버십(getActiveMembership)과 서비스
 * 요청 행을 받아 DB를 다시 조회하지 않는다 — Prisma $transaction 콜백
 * 안에서는 콜백 인자로 받은 tx가 아니라 전역 prisma로 쿼리를 날리면
 * 트랜잭션 격리가 깨지므로, 트랜잭션을 쓰는 라우트는 멤버십을
 * 트랜잭션 시작 전에 미리 조회해 이 함수에 넘긴다.
 *
 * STAFF가 담당하지 않은 건은 목록·상세 화면에서 애초에 보이지 않으므로
 * (getServiceRequestReadAccess와 동일 기준) notfound로 처리해 존재
 * 자체를 숨긴다. VIEWER는 모든 건을 조회할 수 있으므로 쓰기만 막는
 * forbidden이다.
 */
export function evaluateServiceRequestWriteAccess(
  membership: ActiveMembership,
  userId: string,
  request: ServiceRequestRef,
): ServiceRequestPermissionResult {
  if (request.partnerId !== membership.partnerId) return { ok: false, reason: "notfound" };
  const isAssignedStaff = request.partnerStaffId === userId;
  if (membership.role === "STAFF" && !isAssignedStaff) return { ok: false, reason: "notfound" };
  if (membership.role === "VIEWER") return { ok: false, reason: "forbidden" };
  return { ok: true, role: membership.role, isAssignedStaff };
}

/** 트랜잭션을 쓰지 않는 라우트 전용 편의 함수 — 멤버십 조회 + 판단을 한 번에 한다. */
export async function getServiceRequestWritePermission(
  user: { id: string; status: string; memberType: string; partnerId: string | null },
  request: ServiceRequestRef,
): Promise<ServiceRequestPermissionResult> {
  const membership = await getActiveMembership(user);
  if (!membership) return { ok: false, reason: "notfound" };
  return evaluateServiceRequestWriteAccess(membership, user.id, request);
}

/** STAFF가 담당하지 않은 건인지만 가려낸다(VIEWER는 항상 조회 가능). 상세 페이지·파일 다운로드에서 쓴다. */
export function evaluateServiceRequestReadAccess(
  membership: ActiveMembership,
  userId: string,
  request: ServiceRequestRef,
): boolean {
  if (request.partnerId !== membership.partnerId) return false;
  if (membership.role === "STAFF" && request.partnerStaffId !== userId) return false;
  return true;
}

export async function getServiceRequestReadAccess(
  user: { id: string; status: string; memberType: string; partnerId: string | null },
  request: ServiceRequestRef,
): Promise<boolean> {
  const membership = await getActiveMembership(user);
  if (!membership) return false;
  return evaluateServiceRequestReadAccess(membership, user.id, request);
}

/**
 * 담당자 배정 전용 — OWNER/MANAGER만 가능하다(담당 STAFF 본인도 불가,
 * 표의 "담당자관리" 칸 기준). STAFF가 담당하지 않은 건은 조회도 못 하므로
 * notfound로 처리한다.
 */
export function evaluateStaffAssignmentAccess(
  membership: ActiveMembership,
  userId: string,
  request: ServiceRequestRef,
): ServiceRequestPermissionResult {
  if (request.partnerId !== membership.partnerId) return { ok: false, reason: "notfound" };
  const isAssignedStaff = request.partnerStaffId === userId;
  if (membership.role === "STAFF" && !isAssignedStaff) return { ok: false, reason: "notfound" };
  if (membership.role !== "OWNER" && membership.role !== "MANAGER") {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, role: membership.role, isAssignedStaff };
}
