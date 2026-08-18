/**
 * 서버 환경변수 검증.
 *
 * 필수값이 없거나 잘못된 채로 조용히 떠서 요청이 올 때마다 알 수 없는
 * 오류를 내는 대신, 시작 시점에 명확한 오류로 즉시 실패시킨다.
 * `src/instrumentation.ts`에서 애플리케이션 시작 시 한 번 호출한다.
 */
export function validateServerEnv() {
  const problems: string[] = [];

  if (!process.env.DATABASE_URL) {
    problems.push("DATABASE_URL이 설정되지 않았습니다.");
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret || sessionSecret.length < 32) {
    problems.push("SESSION_SECRET은 32자 이상의 문자열이어야 합니다.");
  }

  // APP_URL은 로컬에서는 localhost로 자동 대체되므로(src/lib/appUrl.ts) 여기서는
  // production에서만 강제한다. 형식 자체는 실제 사용 시점에 appUrl.ts가 검증한다.
  if (process.env.NODE_ENV === "production" && !process.env.APP_URL) {
    problems.push("APP_URL이 설정되지 않았습니다(운영 환경 필수).");
  }

  // 둘 중 하나만 있으면 설정 실수일 가능성이 높다 — 조용히 발송 누락으로
  // 이어지지 않도록 시작 시점에 막는다.
  const hasResendKey = Boolean(process.env.RESEND_API_KEY);
  const hasResendFrom = Boolean(process.env.RESEND_FROM);
  if (hasResendKey !== hasResendFrom) {
    problems.push("RESEND_API_KEY와 RESEND_FROM은 함께 설정해야 합니다.");
  }

  // 선택값이지만, 설정했다면 오타로 인해 알림이 조용히 유실되지 않도록
  // 형식만 검증한다(발송 가능 여부는 RESEND_API_KEY 유무가 결정한다).
  const adminNotificationEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (adminNotificationEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminNotificationEmail)) {
    problems.push("ADMIN_NOTIFICATION_EMAIL이 올바른 이메일 형식이 아닙니다.");
  }

  // 소셜 로그인도 RESEND와 같은 원칙 — provider별로 clientId/clientSecret
  // 중 하나만 있으면 설정 실수다. 둘 다 없으면 그 provider는 그냥 숨겨진다
  // (src/lib/oauth/providers.ts의 isProviderConfigured).
  const oauthProviderEnvPairs: [string, string, string][] = [
    ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET", "Google"],
    ["KAKAO_CLIENT_ID", "KAKAO_CLIENT_SECRET", "Kakao"],
    ["NAVER_CLIENT_ID", "NAVER_CLIENT_SECRET", "Naver"],
  ];
  for (const [idKey, secretKey, label] of oauthProviderEnvPairs) {
    const hasId = Boolean(process.env[idKey]);
    const hasSecret = Boolean(process.env[secretKey]);
    if (hasId !== hasSecret) {
      problems.push(`${idKey}와 ${secretKey}는 함께 설정해야 합니다(${label} 로그인).`);
    }
  }

  // 매물 후보 지도(NCP Maps)도 같은 원칙 — 하나만 있으면 설정 실수다. 둘 다
  // 없으면 지도는 그냥 꺼진 것처럼 동작한다(src/lib/naverMap.ts).
  const hasNcpMapId = Boolean(process.env.NCP_MAP_CLIENT_ID);
  const hasNcpMapSecret = Boolean(process.env.NCP_MAP_CLIENT_SECRET);
  if (hasNcpMapId !== hasNcpMapSecret) {
    problems.push("NCP_MAP_CLIENT_ID와 NCP_MAP_CLIENT_SECRET은 함께 설정해야 합니다(매물 지도).");
  }

  if (problems.length > 0) {
    throw new Error(
      `서버 환경변수 설정을 확인해주세요 (.env.example 참고):\n- ${problems.join("\n- ")}`,
    );
  }
}
