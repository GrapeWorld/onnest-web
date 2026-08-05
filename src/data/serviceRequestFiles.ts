export const serviceRequestFileCategories = ["QUOTE", "PHOTO", "CONTRACT"] as const;
export type ServiceRequestFileCategory = (typeof serviceRequestFileCategories)[number];

export const serviceRequestFileCategoryLabels: Record<ServiceRequestFileCategory, string> = {
  QUOTE: "견적서",
  PHOTO: "작업 사진",
  CONTRACT: "계약서",
};
