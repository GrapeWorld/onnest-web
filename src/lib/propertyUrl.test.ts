import { describe, expect, it } from "vitest";
import { isSafeExternalUrl, getPropertySourceLabel } from "@/lib/propertyUrl";

describe("isSafeExternalUrl", () => {
  it.each([
    "https://fin.land.naver.com/complexes/12345",
    "http://example.com/listing/1",
    "https://new.land.naver.com/articles/12345?a=1",
  ])("allows http/https URL %s", (url) => {
    expect(isSafeExternalUrl(url)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "file:///etc/passwd",
    "ftp://example.com/file",
    "not a url",
    "",
    "  ",
  ])("rejects unsafe or invalid value %s", (value) => {
    expect(isSafeExternalUrl(value)).toBe(false);
  });
});

describe("getPropertySourceLabel", () => {
  it.each([
    "https://fin.land.naver.com/home",
    "https://new.land.naver.com/complexes/123",
    "https://land.naver.com/article/1",
  ])("labels naver real-estate hosts as 네이버페이 부동산 (%s)", (url) => {
    expect(getPropertySourceLabel(url)).toBe("네이버페이 부동산");
  });

  it.each([
    "https://example.com/listing/1",
    "https://www.zigbang.com/home/apartment/123",
    "https://land.naver.com.evil.com/phishing",
  ])("labels everything else as 기타 외부 매물 (%s)", (url) => {
    expect(getPropertySourceLabel(url)).toBe("기타 외부 매물");
  });

  it("falls back to 기타 외부 매물 for an unparsable value", () => {
    expect(getPropertySourceLabel("not a url")).toBe("기타 외부 매물");
  });
});
