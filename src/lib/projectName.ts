import {
  subtypesByCategory,
  transactionTypeLabels,
  type SpaceCategory,
  type TransactionType,
} from "@/data/projectSpace";

/** 주소 문자열에서 "○○동" 토큰을 찾는다. 없으면 undefined. */
function extractDong(address?: string) {
  if (!address) return undefined;
  const match = address.match(/(\S+동)(?=\s|$)/);
  return match?.[1];
}

function subtypeLabel(category: SpaceCategory, subtype: string) {
  return (
    subtypesByCategory[category].find((option) => option.value === subtype)
      ?.label ?? "공간"
  );
}

/**
 * 3단계에서 보여주는 프로젝트 이름 초안. 특정 지역명을 하드코딩하지 않고
 * 사용자가 입력한 주소에서 "동"만 뽑아 쓴다 — 없으면 "새 ○○" 형태로
 * 대체한다. 사용자가 자유롭게 수정할 수 있다는 전제의 "제안"일 뿐이다.
 */
export function suggestProjectName({
  address,
  spaceCategory,
  spaceSubtype,
  transactionType,
}: {
  address?: string;
  spaceCategory: SpaceCategory;
  spaceSubtype: string;
  transactionType: TransactionType;
}) {
  const label = subtypeLabel(spaceCategory, spaceSubtype);
  const transactionLabel = transactionTypeLabels[transactionType];
  const dong = extractDong(address);
  const actionWord = spaceCategory === "residential" ? "입주" : "이전";

  if (dong) {
    return `${dong} ${label} ${transactionLabel} ${actionWord}`;
  }

  if (spaceCategory === "residential") {
    return `새 ${label} ${transactionLabel} 프로젝트`;
  }

  return `${label} ${transactionLabel} 프로젝트`;
}
