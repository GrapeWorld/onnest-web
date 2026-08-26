/**
 * Excel(.xlsx) 셀에 사용자 입력을 넣기 전 반드시 거쳐야 하는 안전 처리.
 * "화면에서 이스케이프했으니 안전하다"는 가정을 하지 않는다 — xlsx는 셀을
 * 문자열 타입으로 저장해도, 일부 스프레드시트 프로그램이 `=`/`+`/`-`/`@`로
 * 시작하는 셀 내용을 열 때 다시 수식으로 해석하는 알려진 결함이 있다
 * (CSV/Excel 수식 주입). 시작 문자가 위험하면 작은따옴표를 앞에 붙여
 * 텍스트로 강제한다.
 */
const FORMULA_INJECTION_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

/**
 * XML(xlsx 내부 포맷)이 허용하지 않는 제어문자를 제거한다. 탭(0x09)·
 * 개행(0x0A)·캐리지리턴(0x0D)은 여러 줄 메모 같은 정상 콘텐츠라 남기고,
 * 그 외 0x00~0x1F, 0x7F 제어문자만 제거한다 — 정규식 대신 코드포인트로
 * 직접 걸러 의도를 명확히 한다.
 */
function stripControlChars(value: string): string {
  let result = "";
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    const isAllowedWhitespace = code === 0x09 || code === 0x0a || code === 0x0d;
    const isDisallowedControl = (code <= 0x1f && !isAllowedWhitespace) || code === 0x7f;
    if (!isDisallowedControl) result += char;
  }
  return result;
}

/** Excel 셀에 넣기 전 문자열 값을 정제한다. null/undefined는 빈 문자열로 취급한다. */
export function sanitizeExcelCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const stringValue = typeof value === "number" ? String(value) : value;
  const withoutControlChars = stripControlChars(stringValue);
  const startsUnsafe = FORMULA_INJECTION_PREFIXES.some((prefix) =>
    withoutControlChars.startsWith(prefix),
  );
  return startsUnsafe ? `'${withoutControlChars}` : withoutControlChars;
}

/**
 * 외부로 나가는 하이퍼링크로 걸어도 되는 URL인지 확인한다. http/https만
 * 허용 — javascript:/data:/file: 등으로 자동 실행 링크를 만들지 않는다.
 * src/lib/propertyUrl.ts의 isSafeExternalUrl과 같은 원칙이며, Excel
 * 하이퍼링크 전용으로 이 파일에 별도로 둔다(엑셀 안전 유틸은 이 파일에만
 * 모아 재사용 경계를 명확히 한다).
 */
export function isSafeExcelHyperlink(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 다운로드 파일명에 쓸 수 있는 안전한 문자열로 정제한다. 경로 구분자,
 * 제어문자, Content-Disposition 헤더를 깨뜨릴 수 있는 문자를 제거한다.
 * 고객 이메일·전화번호 같은 개인정보를 파일명에 넣지 않는다는 정책은
 * 호출부 책임이다 — 이 함수는 "안전한 문자만 남기기"만 담당한다.
 */
export function sanitizeExcelFilename(value: string): string {
  const withoutControlChars = stripControlChars(value);
  const safe = withoutControlChars
    .replace(/[\\/:"*?<>|]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return safe || "onnest-export";
}

/** 오늘 날짜를 YYYY-MM-DD로(APP 표준 시간대인 Asia/Seoul 기준). */
export function todayDateStamp(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}
