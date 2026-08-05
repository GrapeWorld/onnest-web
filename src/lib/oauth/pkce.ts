import { randomBytes, createHash, timingSafeEqual } from "crypto";

export function generateState() {
  return randomBytes(32).toString("base64url");
}

export function generateCodeVerifier() {
  return randomBytes(32).toString("base64url");
}

export function generateNonce() {
  return randomBytes(32).toString("base64url");
}

export function createCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

/** 길이가 다르면 timingSafeEqual이 예외를 던지므로 먼저 걸러낸다. */
export function timingSafeEqualString(a: string, b: string) {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}
