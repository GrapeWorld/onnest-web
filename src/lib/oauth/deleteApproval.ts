const DELETE_APPROVAL_WINDOW_MS = 5 * 60 * 1000;

/**
 * 소셜 전용 회원의 탈퇴 재인증 승인 여부. Date.now() 호출을 별도 순수
 * 모듈로 빼둔다 — React Compiler 린트 규칙(react-hooks/purity)이 컴포넌트
 * 본문에서 직접 부르는 impure 함수 호출을 막고, 이 파일은 session.ts와
 * 달리 SESSION_SECRET 검증 같은 import-time 부수효과가 없어 테스트에서
 * 그대로 임포트해 쓸 수 있다.
 */
export function isDeleteApproved(deleteApprovedAt: number | undefined) {
  return (
    typeof deleteApprovedAt === "number" &&
    Date.now() - deleteApprovedAt < DELETE_APPROVAL_WINDOW_MS
  );
}
