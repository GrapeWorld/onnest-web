export const partnerVerificationStatuses = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "SUSPENDED",
] as const;

export type PartnerVerificationStatus = (typeof partnerVerificationStatuses)[number];

export const partnerVerificationStatusLabels: Record<PartnerVerificationStatus, string> = {
  PENDING: "검토 대기",
  APPROVED: "승인",
  REJECTED: "반려",
  SUSPENDED: "이용 중지",
};

export const partnerVerificationStatusClassName: Record<PartnerVerificationStatus, string> = {
  PENDING: "bg-cream text-forest",
  APPROVED: "bg-mint text-forest",
  REJECTED: "bg-red-100 text-red-700",
  SUSPENDED: "bg-ink/15 text-ink/70",
};

/** 이 상태에서 저 상태로 바꿀 때 사유(reason)가 필수인지. 반려·중지는 근거를 남겨야 한다. */
export function isVerificationReasonRequired(toStatus: PartnerVerificationStatus) {
  return toStatus === "REJECTED" || toStatus === "SUSPENDED";
}

/** 배정 후보가 되려면 검증 승인 + 활성화 둘 다 필요하다. */
export function isPartnerAssignable(partner: { active: boolean; verificationStatus: string }) {
  return partner.active && partner.verificationStatus === "APPROVED";
}
