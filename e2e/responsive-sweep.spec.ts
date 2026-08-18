import { test } from "./test-base";
import { sweepWidths } from "./responsive";

/**
 * 공개 핵심 페이지는 특정 기기 해상도가 아니라 320~1366px 전 구간에서
 * 20px 간격으로 연속 검사한다. Tailwind 기본 breakpoint(640/768/1024/1280)
 * 전환 지점도 이 구간 안에 자연히 포함된다.
 */
const PUBLIC_PAGES: [string, string][] = [
  ["/", "홈"],
  ["/auth/login", "로그인"],
  ["/auth/signup", "회원가입"],
  ["/service", "서비스 소개"],
  ["/pricing", "요금 안내"],
  ["/move-in", "입주 준비"],
  ["/partners", "제휴"],
  ["/contact", "문의"],
  ["/terms", "이용약관"],
  ["/privacy", "개인정보처리방침"],
  ["/policy/safety", "안전·운영 정책"],
  ["/handover", "생활 정보 안내"],
  ["/policy/handover", "생활 정보 정책"],
];

for (const [path, label] of PUBLIC_PAGES) {
  test(`${label} 페이지는 320~1366px 전 구간에서 레이아웃이 깨지지 않는다`, async ({ page }) => {
    await page.goto(path);
    await sweepWidths(page, { minWidth: 320, maxWidth: 1366, step: 20 });
  });
}
