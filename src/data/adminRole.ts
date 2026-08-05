export const adminRoles = ["super", "viewer"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const adminRoleLabels: Record<AdminRole, string> = {
  super: "최고관리자",
  viewer: "조회전용 관리자",
};

export const adminRoleClassName: Record<AdminRole, string> = {
  super: "bg-forest text-white",
  viewer: "bg-cream text-forest",
};
