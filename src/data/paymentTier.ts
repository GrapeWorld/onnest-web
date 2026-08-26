/**
 * 고객 결제 등급. src/data/pricing.ts의 요금제 이름과 값을 맞춘다 — 아직
 * 실제 결제 연동은 없고(pricing.ts는 소개용 정적 카피), 관리자가 상담·
 * 수기 결제 확인 후 계정에 등급만 표시해 두는 용도다.
 */
export const paymentTiers = ["FREE", "BASIC", "PREMIUM", "PROJECT_PASS"] as const;
export type PaymentTier = (typeof paymentTiers)[number];

export const paymentTierLabels: Record<PaymentTier, string> = {
  FREE: "Free",
  BASIC: "Basic",
  PREMIUM: "Premium",
  PROJECT_PASS: "Project Pass",
};

export const paymentTierClassName: Record<PaymentTier, string> = {
  FREE: "bg-cream text-ink/60",
  BASIC: "bg-mint text-forest",
  PREMIUM: "bg-forest text-white",
  PROJECT_PASS: "bg-navy text-white",
};
