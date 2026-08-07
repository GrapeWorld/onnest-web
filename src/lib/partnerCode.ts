import { randomBytes } from "crypto";

/** 업체 공개 식별자. 내부 id(cuid)와 별개로 외부 화면·검색에 쓴다. */
export function generatePartnerCode() {
  return `ONP-${randomBytes(3).toString("hex").toUpperCase()}`;
}
