import {
  transactionOptionsByCategory,
  type ProjectStage,
  type SpaceCategory,
  type TransactionType,
} from "@/data/projectSpace";

/** 위저드(생성)와 수정 폼이 함께 쓰는 필드 스타일. ProjectForm.tsx와 동일하다. */
export const fieldClass =
  "box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest";

export const labelClass = "grid min-w-0 gap-2 text-sm font-semibold text-forest";

/** ProjectWizard의 임시 저장 키. 매물 후보에서 프로젝트를 만들 때도 같은 키로 초안을 미리 채운다. */
export const PROJECT_DRAFT_STORAGE_KEY = "onnest:new-project-draft";
/** 매물 후보에서 시작된 프로젝트 생성이면, 제출 시 이 키의 후보 id를 함께 보내 연결한다. */
export const SOURCE_CANDIDATE_STORAGE_KEY = "onnest:new-project-source-candidate-id";

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
