import { createHash, randomBytes } from "crypto";

/** 비밀번호 재설정 링크에 쓰는 URL-safe 랜덤 토큰. 원문은 저장하지 않는다. */
export function generateResetToken() {
  return randomBytes(32).toString("hex");
}

/** passwordHash와 같은 원칙: 원문 대신 해시만 DB에 남긴다. */
export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

/** 하이픈 표기 차이(010-1234-5678 vs 01012345678)를 무시하고 비교하기 위해 숫자만 남긴다. */
export function normalizePhone(phone: string) {
  return phone.replace(/[^0-9]/g, "");
}
