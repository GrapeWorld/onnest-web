/**
 * 관리자 회원 목록 화면 전용 표시 마스킹.
 *
 * src/lib/email.ts에도 비슷한 함수가 있지만 그건 로그에 남길 때만 쓰는
 * 비공개 헬퍼라 재사용 범위가 다르다 — 여기는 화면에 보여주는 용도라
 * 별도로 둔다.
 */

/** ab***@example.com */
export function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const visible = local.slice(0, Math.min(2, local.length));
  const hidden = "*".repeat(Math.max(local.length - visible.length, 2));
  return `${visible}${hidden}@${domain}`;
}

/** 010-12**-5678 형태. 하이픈 없는 입력도 같은 규칙으로 가운데를 가린다. */
export function maskPhone(phone: string) {
  const digits = phone.replace(/[^0-9]/g, "");
  if (digits.length < 7) return phone;

  const front = digits.slice(0, digits.length - 8);
  const middle = digits.slice(digits.length - 8, digits.length - 4);
  const back = digits.slice(digits.length - 4);
  const maskedMiddle = middle.slice(0, 2) + "*".repeat(middle.length - 2);

  return [front, maskedMiddle, back].filter(Boolean).join("-");
}
