/** 원화 금액을 3자리 콤마로 표시한다. amount는 항상 정수(원 단위)다. */
export function formatWon(amount: number) {
  return new Intl.NumberFormat("ko-KR").format(amount);
}
