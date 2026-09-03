export type SuggestionOriginFields = {
  sharedReason: string | null;
  cautionNote: string | null;
};

export type SuggestionOriginDisplay = {
  /** 공유 이유 원문을 별도로 보여줘야 하는지 — 원문이 있고, 고객이 장점을 고쳐서 지금 값과 달라졌을 때만. */
  showReason: boolean;
  /** 확인 필요 사항 원문을 별도로 보여줘야 하는지 — 위와 같은 원칙. */
  showCaution: boolean;
  /** 원문이 하나 이상 있지만 전부 지금 장점·걱정되는 점과 같아, 이미 반영돼 있다는 안내만 보여주면 될 때. */
  showReflectedNotice: boolean;
  /** 애초에 공유 이유·확인 필요 사항 둘 다 없었을 때. */
  showEmptyNotice: boolean;
};

/**
 * 관리자 공유 매물을 저장하면 공유 이유·확인 필요 사항이 그 후보의
 * 장점·걱정되는 점으로 그대로 복사된다("내 매물 후보에 저장" 흐름,
 * candidate-properties/new/page.tsx). 상세 화면은 그 복사된 값을 이미
 * "장점"·"걱정되는 점" 카드에서 보여주므로, 여기서는 고객이 나중에 그
 * 필드를 직접 고쳐 원문과 달라졌을 때만 원문을 따로 보여준다 — 같은
 * 문장을 두 번 보여주지 않는다.
 */
export function describeSuggestionOrigin(
  origin: SuggestionOriginFields,
  advantages: string | null,
  concerns: string | null,
): SuggestionOriginDisplay {
  const hasReason = Boolean(origin.sharedReason);
  const hasCaution = Boolean(origin.cautionNote);
  const showReason = hasReason && origin.sharedReason !== advantages;
  const showCaution = hasCaution && origin.cautionNote !== concerns;

  return {
    showReason,
    showCaution,
    showReflectedNotice: (hasReason || hasCaution) && !showReason && !showCaution,
    showEmptyNotice: !hasReason && !hasCaution,
  };
}
