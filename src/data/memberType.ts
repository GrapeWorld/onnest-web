export const memberTypes = ["CUSTOMER", "PARTNER"] as const;
export type MemberType = (typeof memberTypes)[number];

export const memberTypeLabels: Record<MemberType, string> = {
  CUSTOMER: "고객",
  PARTNER: "업체",
};

export const memberTypeClassName: Record<MemberType, string> = {
  CUSTOMER: "bg-mint text-forest",
  PARTNER: "bg-cream text-forest",
};

export function isMemberType(value: string): value is MemberType {
  return (memberTypes as readonly string[]).includes(value);
}

/**
 * 관리자 화면에 표시하는 최종 분류. adminRole이 있으면(super/viewer) 항상
 * "ADMIN"으로 표시하고, 없을 때만 memberType으로 업체·고객을 가른다.
 * adminRole이 회수되면 memberType이 그대로 남아 있으므로 자동으로 원래
 * 유형(업체/고객)으로 돌아간다 — 별도 로직이 필요 없다.
 */
export const memberClassifications = ["ADMIN", "PARTNER", "CUSTOMER"] as const;
export type MemberClassification = (typeof memberClassifications)[number];

export const memberClassificationLabels: Record<MemberClassification, string> = {
  ADMIN: "관리자",
  PARTNER: "업체",
  CUSTOMER: "고객",
};

export const memberClassificationClassName: Record<MemberClassification, string> = {
  ADMIN: "bg-navy text-white",
  PARTNER: "bg-cream text-forest",
  CUSTOMER: "bg-mint text-forest",
};

export function isMemberClassification(value: string): value is MemberClassification {
  return (memberClassifications as readonly string[]).includes(value);
}

export function getMemberClassification(user: {
  adminRole: string | null;
  memberType: string;
}): MemberClassification {
  if (user.adminRole === "super" || user.adminRole === "viewer") return "ADMIN";
  return user.memberType === "PARTNER" ? "PARTNER" : "CUSTOMER";
}
