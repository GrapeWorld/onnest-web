export const inquiryMessageSenderRoles = ["CUSTOMER", "ADMIN"] as const;
export type InquiryMessageSenderRole = (typeof inquiryMessageSenderRoles)[number];

export const inquiryMessageSenderRoleLabels: Record<InquiryMessageSenderRole, string> = {
  CUSTOMER: "고객",
  ADMIN: "ONNEST",
};
