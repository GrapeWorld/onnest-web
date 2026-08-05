export type VersionedSession = {
  userId?: string;
  authVersion?: number;
};

export type VersionedUser = {
  id: string;
  authVersion: number;
};

/** 비밀번호 변경 전에 발급된 세션과 버전이 없는 레거시 세션을 거부한다. */
export function isSessionCurrent(
  session: VersionedSession,
  user: VersionedUser | null,
) {
  return Boolean(
    user &&
      session.userId === user.id &&
      typeof session.authVersion === "number" &&
      session.authVersion === user.authVersion,
  );
}
