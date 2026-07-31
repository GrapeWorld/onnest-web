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

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
