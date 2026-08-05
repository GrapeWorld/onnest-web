/** callback이 실패 시 붙이는 짧은 코드 → 사용자에게 보여줄 문구. */
const oauthErrorMessages: Record<string, string> = {
  cancelled: "로그인을 취소했습니다.",
  expired: "로그인 세션이 만료됐습니다. 다시 시도해주세요.",
  invalid_state: "로그인 요청이 유효하지 않습니다. 다시 시도해주세요.",
  provider_error: "로그인 제공자와 통신 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  email_unverified: "이메일 정보를 확인할 수 없습니다. 이메일로 회원가입해주세요.",
  account_conflict:
    "같은 이메일로 가입된 계정이 있습니다. 기존 방식으로 로그인한 뒤 마이페이지에서 소셜 계정을 연결해주세요.",
  login_failed: "로그인할 수 없는 계정입니다.",
  already_linked: "이미 다른 계정에 연결된 소셜 계정입니다.",
  reauth_failed: "본인 확인에 실패했습니다. 다시 시도해주세요.",
  rate_limited: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
};

export function getOAuthErrorMessage(code: string | undefined | null) {
  if (!code) return null;
  return oauthErrorMessages[code] ?? "로그인 중 문제가 발생했습니다. 다시 시도해주세요.";
}
