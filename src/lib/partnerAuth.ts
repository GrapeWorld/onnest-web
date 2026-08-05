import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** memberType이 PARTNER이고 실제로 연결된 업체가 있는지 확인한다. */
export function isPartnerStaff(user: {
  memberType: string;
  partnerId: string | null;
}): user is typeof user & { partnerId: string } {
  return user.memberType === "PARTNER" && Boolean(user.partnerId);
}

/**
 * 파트너 포털 페이지에서 쓰는 가드. requireAdmin()과 같은 원칙 —
 * 로그인 안 했으면 로그인 화면으로, 업체 직원이 아니면 포털의 존재를
 * 드러내지 않고 홈으로 보낸다.
 */
export async function requirePartnerStaff() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  if (!isPartnerStaff(user)) redirect("/");
  return user;
}
