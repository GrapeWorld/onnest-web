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
/**
 * 예전 형식(id 문자열만 저장) — 새 형식과 별개로 계속 같이 써서, 캐시된
 * 구버전 번들이 이 키만 읽어도 최소한 id는 얻을 수 있게 한다. 새 코드는
 * 이 키를 직접 읽지 않고 아래 readSourceCandidateInfo를 통해서만 쓴다.
 */
export const SOURCE_CANDIDATE_STORAGE_KEY = "onnest:new-project-source-candidate-id";
/** 매물명까지 함께 담는 새 형식. 위저드 화면에 "어떤 매물과 연결되는지"를 보여줄 때 쓴다. */
export const SOURCE_CANDIDATE_INFO_STORAGE_KEY = "onnest:new-project-source-candidate-info";

export type SourceCandidateInfo = { id: string; title: string };

/** ConvertToProjectButton이 호출한다 — 새 형식과 예전 형식(id만) 둘 다 남겨 하위 호환을 유지한다. */
export function writeSourceCandidateInfo(info: SourceCandidateInfo) {
  window.localStorage.setItem(SOURCE_CANDIDATE_INFO_STORAGE_KEY, JSON.stringify(info));
  window.localStorage.setItem(SOURCE_CANDIDATE_STORAGE_KEY, info.id);
}

/**
 * 새 형식을 먼저 읽고, 없거나 손상됐으면 예전 형식(id만)으로 내려간다 —
 * 그 경우 매물명은 알 수 없으므로 빈 문자열로 둔다(화면에서는 이름 대신
 * 일반적인 안내 문구로 대체한다). localStorage 값은 표시 용도일 뿐이고
 * 실제 연결은 서버가 소유권을 다시 검사하므로, 여기서는 형식만 확인하고
 * 신뢰하지 않는다.
 */
export function readSourceCandidateInfo(): SourceCandidateInfo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SOURCE_CANDIDATE_INFO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (
        parsed &&
        typeof parsed === "object" &&
        "id" in parsed &&
        typeof (parsed as { id: unknown }).id === "string" &&
        (parsed as { id: string }).id.length > 0 &&
        "title" in parsed &&
        typeof (parsed as { title: unknown }).title === "string"
      ) {
        return { id: (parsed as SourceCandidateInfo).id, title: (parsed as SourceCandidateInfo).title };
      }
    }
  } catch {
    // 손상된 값은 무시하고 아래 예전 형식으로 내려간다.
  }
  const legacyId = window.localStorage.getItem(SOURCE_CANDIDATE_STORAGE_KEY);
  if (legacyId) return { id: legacyId, title: "" };
  return null;
}

/** 제출 성공 또는 "매물 연결 해제" 시 새·예전 형식을 모두 지운다. */
export function clearSourceCandidateInfo() {
  window.localStorage.removeItem(SOURCE_CANDIDATE_INFO_STORAGE_KEY);
  window.localStorage.removeItem(SOURCE_CANDIDATE_STORAGE_KEY);
}

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
