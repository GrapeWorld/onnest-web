export const moderationStatuses = [
  "pending",
  "approved",
  "revision_requested",
  "hidden",
] as const;

export type ModerationStatus = (typeof moderationStatuses)[number];

export const moderationStatusLabels: Record<ModerationStatus, string> = {
  pending: "검토 대기",
  approved: "승인",
  revision_requested: "수정 요청",
  hidden: "비공개 처리",
};

export const moderationStatusClassName: Record<ModerationStatus, string> = {
  pending: "bg-cream text-forest",
  approved: "bg-mint text-forest",
  revision_requested: "bg-navy text-white",
  hidden: "bg-forest text-white",
};
