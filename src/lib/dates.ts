/**
 * 날짜만 다루는 값(입주 예정일, 일정)의 공통 처리.
 *
 * <input type="date">는 "YYYY-MM-DD"를 주고, 이를 그대로 new Date()에 넣으면
 * UTC 자정으로 파싱된다. 저장·표시·D-day 계산을 모두 서울 기준으로 고정해
 * 서버 시간대가 무엇이든 같은 날짜가 나오게 한다.
 */

const TIME_ZONE = "Asia/Seoul";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "long",
  timeZone: TIME_ZONE,
});

const weekdayFormatter = new Intl.DateTimeFormat("ko-KR", {
  weekday: "short",
  timeZone: TIME_ZONE,
});

/** "2026년 9월 1일" */
export function formatDate(date: Date) {
  return dateFormatter.format(date);
}

/** "화" */
export function formatWeekday(date: Date) {
  return weekdayFormatter.format(date);
}

/** "YYYY-MM-DD" — <input type="date"> 초기값용 */
export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

/** 서울 기준 오늘 자정(UTC로 표현). D-day 계산의 기준점. */
export function todayInSeoul() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return new Date(`${parts}T00:00:00.000Z`);
}

/**
 * 오늘 기준 남은 일수. 오늘이면 0, 지났으면 음수.
 * 두 값 모두 UTC 자정이라 단순 뺄셈으로 정확히 나뉜다.
 */
export function daysUntil(date: Date, from = todayInSeoul()) {
  const MS_PER_DAY = 24 * 60 * 60 * 1000;
  return Math.round((date.getTime() - from.getTime()) / MS_PER_DAY);
}

/** "D-3", "D-DAY", "3일 지남" */
export function formatDDay(date: Date, from = todayInSeoul()) {
  const days = daysUntil(date, from);
  if (days === 0) return "D-DAY";
  if (days > 0) return `D-${days}`;
  return `${Math.abs(days)}일 지남`;
}

/**
 * "YYYY-MM-DD"(서울 기준 달력일)를 그 날 서울 자정에 해당하는 UTC Date로
 * 변환한다. createdAt처럼 실제 시각까지 담긴 값을 날짜 기간으로 필터링할 때
 * 쓴다 — 단순히 T00:00:00.000Z로 파싱하면 UTC 자정(=서울 오전 9시)이 돼
 * 자정~오전 9시 사이 값이 하루 어긋난다.
 */
export function kstDateStringToUtc(value: string) {
  return new Date(`${value}T00:00:00.000+09:00`);
}
