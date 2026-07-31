/**
 * 인수인계서 금칙 표현 검증 규칙 테스트.
 *   npm run test:content
 *
 * 정규식은 오탐(예: "3호선"을 호실로 오인)이 나기 쉬워 통과 케이스도 함께 검사한다.
 */
import { findContentIssues } from "../src/lib/handoverContent.ts";

const cases = [
  // 통과해야 하는 정상 문장
  ["채광은 오전에 좋고 환기는 잘 됩니다.", "통과"],
  ["겨울에 결로가 생겨 확인이 필요합니다.", "통과"],
  ["야간 주차는 자리가 부족할 수 있어요.", "통과"],
  ["지하철 3호선까지 도보 10분입니다.", "통과"],
  ["보증금 1억 정도 예산이면 됩니다.", "통과"],
  // 차단해야 하는 문장
  ["문의는 010-1234-5678로 주세요", "차단"],
  ["hello@onnest.com 으로 연락", "차단"],
  ["집주인이 정말 불친절했어요", "차단"],
  ["1203호는 결로가 있어요", "차단"],
  ["1203 호 확인 필요", "차단"],
  ["12가 3456 차량이 늘 막아요", "차단"],
  ["옆집 소음이 심해요", "차단"],
];

let failed = 0;
for (const [text, expected] of cases) {
  const labels = findContentIssues(text).map((issue) => issue.label);
  const actual = labels.length ? "차단" : "통과";
  const ok = actual === expected;
  if (!ok) failed += 1;
  console.log(
    `${ok ? "OK  " : "FAIL"} ${actual} (기대:${expected}) | ${text}` +
      (labels.length ? ` -> ${labels.join(", ")}` : ""),
  );
}

if (failed) {
  console.error(`\n${failed}건 실패`);
  process.exit(1);
}
console.log(`\n${cases.length}건 전부 통과`);
