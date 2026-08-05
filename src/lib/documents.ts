/** 문서함에 올릴 수 있는 형식과 크기. API와 화면이 같은 값을 쓴다. */
export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
] as const;

export const allowedExtensionLabel = "JPG, PNG, WEBP, HEIC, PDF";

export const maxFileSize = 10 * 1024 * 1024;

export const maxFileSizeLabel = "10MB";

export function validateUpload(file: File): string | null {
  if (file.size === 0) return "빈 파일은 올릴 수 없습니다.";
  if (file.size > maxFileSize) {
    return `파일 용량은 ${maxFileSizeLabel}까지 올릴 수 있습니다.`;
  }
  if (
    !allowedMimeTypes.includes(file.type as (typeof allowedMimeTypes)[number])
  ) {
    return `${allowedExtensionLabel} 형식만 올릴 수 있습니다.`;
  }
  return null;
}

export function detectUploadMimeType(bytes: Uint8Array):
  | (typeof allowedMimeTypes)[number]
  | null {
  const startsWith = (signature: number[]) =>
    signature.every((value, index) => bytes[index] === value);

  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (
    startsWith([0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  if (startsWith([0x25, 0x50, 0x44, 0x46, 0x2d])) return "application/pdf";

  const box = String.fromCharCode(...bytes.slice(4, 8));
  const brand = String.fromCharCode(...bytes.slice(8, 12));
  if (
    box === "ftyp" &&
    ["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)
  ) {
    return "image/heic";
  }
  return null;
}

/** 클라이언트가 지정한 MIME이 아니라 실제 파일 시그니처를 서버에서 확인한다. */
export async function validateUploadContents(file: File): Promise<string | null> {
  const header = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const detected = detectUploadMimeType(header);
  if (!detected || detected !== file.type) {
    return "파일 내용과 형식이 일치하지 않습니다.";
  }
  return null;
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
