import { describe, expect, it } from "vitest";
import { maskEmail, maskPhone } from "@/lib/mask";

describe("maskEmail", () => {
  it("keeps the first two characters of the local part", () => {
    expect(maskEmail("jonghyun@example.com")).toBe("jo******@example.com");
  });

  it("still masks something for a one-character local part", () => {
    expect(maskEmail("a@example.com")).toBe("a**@example.com");
  });

  it("returns the input unchanged if it isn't a valid email shape", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});

describe("maskPhone", () => {
  it("masks the middle group of a hyphenated 010 number", () => {
    expect(maskPhone("010-1234-5678")).toBe("010-12**-5678");
  });

  it("masks the middle group when there are no hyphens", () => {
    expect(maskPhone("01012345678")).toBe("010-12**-5678");
  });

  it("returns short/unusual input unchanged rather than guessing", () => {
    expect(maskPhone("123")).toBe("123");
  });
});
