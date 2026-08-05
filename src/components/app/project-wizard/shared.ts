import {
  transactionOptionsByCategory,
  type ProjectStage,
  type SpaceCategory,
  type TransactionType,
} from "@/data/projectSpace";

/** 위저드(생성)와 수정 폼이 함께 쓰는 필드 스타일. ProjectForm.tsx와 동일하다. */
export const fieldClass =
  "rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest";

export const labelClass = "grid gap-2 text-sm font-semibold text-forest";

export type ProjectWizardValues = {
  spaceCategory: SpaceCategory | "";
  spaceSubtype: string;
  addressPending: boolean;
  address: string;
  addressDetail: string;
  unitNumber: string;
  transactionType: string;
  details: Record<string, string>;
  projectStage: ProjectStage | "";
  scheduleUndecided: boolean;
  moveInDate: string;
  contractDate: string;
  name: string;
  budget: string;
};

/**
 * 공간 대분류가 바뀌면 세부유형은 항상 초기화하고, 거래유형은 새 대분류에서도
 * 유효할 때만 유지한다(규칙 4). 초기화가 실제로 일어났는지도 함께 돌려줘서
 * 호출부가 안내 문구를 보여줄 수 있게 한다(규칙 5).
 */
export function applyCategoryChange(
  values: ProjectWizardValues,
  newCategory: SpaceCategory,
): { values: ProjectWizardValues; transactionWasReset: boolean } {
  const stillValid = transactionOptionsByCategory[newCategory].includes(
    values.transactionType as TransactionType,
  );

  return {
    values: {
      ...values,
      spaceCategory: newCategory,
      spaceSubtype: "",
      transactionType: stillValid ? values.transactionType : "",
      details: stillValid ? values.details : {},
    },
    transactionWasReset: !stillValid && values.transactionType !== "",
  };
}

export const emptyProjectWizardValues: ProjectWizardValues = {
  spaceCategory: "",
  spaceSubtype: "",
  addressPending: false,
  address: "",
  addressDetail: "",
  unitNumber: "",
  transactionType: "",
  details: {},
  projectStage: "",
  scheduleUndecided: false,
  moveInDate: "",
  contractDate: "",
  name: "",
  budget: "",
};
