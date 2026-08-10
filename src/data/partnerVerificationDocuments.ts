export const partnerVerificationDocumentTypes = ["BUSINESS_REGISTRATION", "BANKBOOK"] as const;
export type PartnerVerificationDocumentType = (typeof partnerVerificationDocumentTypes)[number];

export const partnerVerificationDocumentTypeLabels: Record<PartnerVerificationDocumentType, string> = {
  BUSINESS_REGISTRATION: "사업자등록증",
  BANKBOOK: "통장사본",
};
