/**
 * 인수인계서 본문 검증.
 *
 * 온네스트 원칙: 사람 평가가 아니라 공간과 생활 경험을 남긴다.
 * 개인정보와 특정인 지목 표현을 서버에서 막는다. 클라이언트 검증만으로는
 * API를 직접 호출하는 경로를 막을 수 없으므로 저장 직전에 다시 확인한다.
 */

const patterns: { label: string; regex: RegExp }[] = [
  {
    label: "전화번호",
    regex:
      /01[016-9][\s-]?\d{3,4}[\s-]?\d{4}|\b\d{2,3}[\s-]\d{3,4}[\s-]\d{4}\b/,
  },
  { label: "이메일", regex: /[\w.+-]+@[\w-]+\.[\w.]+/ },
  { label: "주민등록번호", regex: /\b\d{6}[\s-]?[1-4]\d{6}\b/ },
  { label: "차량번호", regex: /\b\d{2,3}[가-힣]\s?\d{4}\b/ },
  // \b는 한글 앞뒤에서 기대대로 동작하지 않아 쓰지 않는다. "3호선"은 제외한다.
  { label: "특정 호실", regex: /\d{3,4}\s?호(?!선)/ },
  {
    label: "집주인·중개사 등 특정인 지목",
    regex:
      /(집주인|임대인|건물주|관리소장|중개사|공인중개|이웃|옆집|윗집|아랫집)/,
  },
  {
    label: "사기·범죄 단정 표현",
    regex: /(사기꾼|사기\s?친|범죄자|고소|고발|먹튀)/,
  },
  {
    label: "욕설·모욕 표현",
    regex: /(개새|씨발|병신|미친놈|또라이|쓰레기같)/,
  },
];

export type ContentIssue = { label: string };

/** 문제가 되는 표현을 모두 찾아 돌려준다. 비어 있으면 통과. */
export function findContentIssues(text: string): ContentIssue[] {
  if (!text) return [];
  return patterns
    .filter(({ regex }) => regex.test(text))
    .map(({ label }) => ({ label }));
}

export function describeIssues(issues: ContentIssue[]) {
  return `다음 표현은 인수인계서에 담을 수 없습니다: ${issues
    .map((issue) => issue.label)
    .join(", ")}. 사람 평가나 개인정보 대신 공간과 생활 경험을 적어주세요.`;
}
