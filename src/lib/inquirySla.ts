// 처리기한 필드 없이 접수일(createdAt) 기준으로만 판단하는 가벼운 지연 경고.
// 정식 SLA(문의 유형별 처리기한, 대시보드 등)는 별도로 설계한다.
export const UNASSIGNED_WARNING_DAYS = 2;
export const UNREVIEWED_WARNING_DAYS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

// "답변 완료"만 종결 상태다 — src/data/inquiries.ts의 inquiryStatuses 참고.
export const openInquiryStatuses = ["신규", "검토 중", "파트너 배정"];

export function isOpenInquiryStatus(status: string) {
  return openInquiryStatuses.includes(status);
}

export type InquiryWarning = {
  unassigned: boolean;
  unreviewed: boolean;
  daysOpen: number;
};

/**
 * 종결되지 않은 문의가 담당자 없이 오래 방치됐거나(미배정), 접수 후
 * 검토조차 시작되지 않은 채(신규 상태) 오래 방치됐을 때 경고를 반환한다.
 * 어느 쪽에도 해당하지 않으면 null.
 */
export function getInquiryWarning(
  inquiry: { status: string; assigneeId: string | null; createdAt: Date },
  now: Date = new Date(),
): InquiryWarning | null {
  if (!isOpenInquiryStatus(inquiry.status)) return null;

  const daysOpen = Math.floor((now.getTime() - inquiry.createdAt.getTime()) / DAY_MS);
  const unassigned = inquiry.assigneeId === null && daysOpen >= UNASSIGNED_WARNING_DAYS;
  const unreviewed = inquiry.status === "신규" && daysOpen >= UNREVIEWED_WARNING_DAYS;

  if (!unassigned && !unreviewed) return null;
  return { unassigned, unreviewed, daysOpen };
}
