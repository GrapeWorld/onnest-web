export const partnerRoles = ["OWNER", "MANAGER", "STAFF", "VIEWER"] as const;
export type PartnerRole = (typeof partnerRoles)[number];

export const partnerRoleLabels: Record<PartnerRole, string> = {
  OWNER: "대표",
  MANAGER: "매니저",
  STAFF: "직원",
  VIEWER: "조회전용",
};

// 초대로 줄 수 있는 역할. OWNER는 초대로 줄 수 없다(백필 또는 대표
// 위임으로만 생긴다).
export const invitablePartnerRoles = ["MANAGER", "STAFF", "VIEWER"] as const;

export const partnerMembershipStatuses = ["ACTIVE", "SUSPENDED", "REVOKED"] as const;
export type PartnerMembershipStatus = (typeof partnerMembershipStatuses)[number];

export const partnerMembershipStatusLabels: Record<PartnerMembershipStatus, string> = {
  ACTIVE: "활성",
  SUSPENDED: "정지",
  REVOKED: "해제됨",
};
