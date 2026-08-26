import { describe, expect, it } from "vitest";
import {
  sanitizeExcelCell,
  isSafeExcelHyperlink,
  sanitizeExcelFilename,
  todayDateStamp,
} from "@/lib/excelSafety";

describe("sanitizeExcelCell", () => {
  it.each([
    ["=SUM(A1:A10)", "'=SUM(A1:A10)"],
    ["=1+1", "'=1+1"],
    ["+1234567890", "'+1234567890"],
    ["-1234567890", "'-1234567890"],
    ["@SUM(1,2)", "'@SUM(1,2)"],
    ["\tmalicious", "'\tmalicious"],
    ["\rmalicious", "'\rmalicious"],
  ])("neutralizes formula-injection prefix in %s", (input, expected) => {
    expect(sanitizeExcelCell(input)).toBe(expected);
  });

  it("leaves ordinary text untouched", () => {
    expect(sanitizeExcelCell("역삼동 24평 전세")).toBe("역삼동 24평 전세");
  });

  it("leaves negative-looking but safe content untouched when it doesn't start with the dangerous char after control-char stripping", () => {
    // 일반 문장 중간에 =/+/- 가 있어도 문제 없다 — 시작 문자만 검사한다.
    expect(sanitizeExcelCell("가격은 100-200만원 사이")).toBe("가격은 100-200만원 사이");
  });

  it("converts null/undefined to an empty string", () => {
    expect(sanitizeExcelCell(null)).toBe("");
    expect(sanitizeExcelCell(undefined)).toBe("");
  });

  it("converts numbers to strings", () => {
    expect(sanitizeExcelCell(42)).toBe("42");
  });

  it("keeps legitimate newlines inside multi-line content", () => {
    const input = "첫째 줄\n둘째 줄";
    expect(sanitizeExcelCell(input)).toBe(input);
  });

  it("strips disallowed control characters but keeps the rest of the content", () => {
    const input = "정상\x00\x07\x1b텍스트";
    expect(sanitizeExcelCell(input)).toBe("정상텍스트");
  });

  it("does not double-prefix content that already starts with a quote-neutralized char after stripping", () => {
    // 제어문자 제거 후에도 위험 문자로 시작하면 정확히 한 번만 접두 처리된다.
    const input = "\x00=cmd|'/bin/bash'!A1";
    expect(sanitizeExcelCell(input)).toBe("'=cmd|'/bin/bash'!A1");
  });
});

describe("isSafeExcelHyperlink", () => {
  it.each(["https://fin.land.naver.com/complexes/1", "http://example.com"])(
    "allows http/https URL %s",
    (url) => {
      expect(isSafeExcelHyperlink(url)).toBe(true);
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "not a url",
    "",
  ])("rejects unsafe or invalid value %s", (value) => {
    expect(isSafeExcelHyperlink(value)).toBe(false);
  });
});

describe("sanitizeExcelFilename", () => {
  it("replaces path separators and reserved characters with a dash", () => {
    expect(sanitizeExcelFilename('a/b\\c:d"e*f?g<h>i|j')).toBe("a-b-c-d-e-f-g-h-i-j");
  });

  it("collapses whitespace into a single dash", () => {
    expect(sanitizeExcelFilename("hello   world")).toBe("hello-world");
  });

  it("strips control characters", () => {
    expect(sanitizeExcelFilename("safe\x00name")).toBe("safename");
  });

  it("falls back to a default when everything is stripped away", () => {
    expect(sanitizeExcelFilename("///???")).toBe("onnest-export");
  });

  it("trims leading and trailing dashes", () => {
    expect(sanitizeExcelFilename("  /leading-and-trailing/  ")).toBe("leading-and-trailing");
  });
});

describe("todayDateStamp", () => {
  it("returns a YYYY-MM-DD formatted date", () => {
    expect(todayDateStamp()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
