import { describe, expect, it } from "vitest";
import {
  detectUploadMimeType,
  validateUpload,
  validateUploadContents,
} from "@/lib/documents";

function file(bytes: number[], name: string, type: string) {
  return new File([new Uint8Array(bytes)], name, { type });
}

describe("document upload validation", () => {
  it.each([
    [[0xff, 0xd8, 0xff, 0xe0], "image/jpeg"],
    [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    [[0x25, 0x50, 0x44, 0x46, 0x2d], "application/pdf"],
    [[0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50], "image/webp"],
  ])("detects %s as %s", (bytes, expected) => {
    expect(detectUploadMimeType(new Uint8Array(bytes as number[]))).toBe(expected);
  });

  it("rejects a text payload disguised as a PDF", async () => {
    const disguised = file([0x68, 0x65, 0x6c, 0x6c, 0x6f], "contract.pdf", "application/pdf");
    await expect(validateUploadContents(disguised)).resolves.toBe(
      "파일 내용과 형식이 일치하지 않습니다.",
    );
  });

  it("rejects empty and oversized metadata", () => {
    expect(validateUpload(file([], "empty.pdf", "application/pdf"))).toBe(
      "빈 파일은 올릴 수 없습니다.",
    );
    const oversized = new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.pdf", {
      type: "application/pdf",
    });
    expect(validateUpload(oversized)).toContain("10MB");
  });
});
