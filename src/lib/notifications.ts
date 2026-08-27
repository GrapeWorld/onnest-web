import type { Prisma, PrismaClient } from "@prisma/client";
import { isAdmin } from "@/lib/auth";
import { sanitizeReturnTo } from "@/lib/oauth/returnTo";
import type { NotificationType } from "@/data/notification";
import { notificationTypeCategory } from "@/data/notification";

type Db = PrismaClient | Prisma.TransactionClient;

export type NotificationInput = {
  recipientUserId: string;
  type: NotificationType;
  title: string;
  body: string;
  internalPath: string;
  /** 같은 소식이 두 번 생성되지 않게 막는 키. 진짜 매번 새 소식이면 생략한다. */
  dedupeKey?: string;
};

/**
 * 알림 한 건을 만든다. dedupeKey가 있으면 (recipientUserId, dedupeKey)
 * 유니크 제약을 이용한 upsert로 "이미 있으면 그대로 둔다"를 구현한다 —
 * create 후 P2002를 catch하는 방식은 쓰지 않는다(트랜잭션 안에서 에러를
 * 던졌다 잡는 처리 자체가 실수하기 쉽고, upsert 하나로 충분하다).
 * PrismaClient와 트랜잭션 클라이언트를 둘 다 받는다 — 업무 데이터 변경과
 * 같은 트랜잭션 안에서 호출하는 게 기본이다.
 */
export async function createNotification(db: Db, input: NotificationInput) {
  const data = {
    recipientUserId: input.recipientUserId,
    type: input.type,
    category: notificationTypeCategory[input.type],
    title: input.title,
    body: input.body,
    internalPath: input.internalPath,
    dedupeKey: input.dedupeKey ?? null,
  };
  if (!input.dedupeKey) {
    return db.notification.create({ data });
  }
  return db.notification.upsert({
    where: {
      recipientUserId_dedupeKey: {
        recipientUserId: input.recipientUserId,
        dedupeKey: input.dedupeKey,
      },
    },
    update: {},
    create: data,
  });
}

/**
 * 여러 수신자에게 같은 소식을 보낸다(예: 새 서비스 요청을 모든 최고관리자
 * 에게). dedupeKey가 있는 항목은 createMany + skipDuplicates로 유니크
 * 제약 위반을 조용히 건너뛴다 — 수신자마다 (recipientUserId, dedupeKey)
 * 조합이 달라 서로 충돌하지 않고, 같은 조합이 이미 있을 때만 건너뛴다.
 */
export async function createNotifications(db: Db, inputs: NotificationInput[]) {
  if (inputs.length === 0) return;
  const rows = inputs.map((input) => ({
    recipientUserId: input.recipientUserId,
    type: input.type,
    category: notificationTypeCategory[input.type],
    title: input.title,
    body: input.body,
    internalPath: input.internalPath,
    dedupeKey: input.dedupeKey ?? null,
  }));
  const withKey = rows.filter((row) => row.dedupeKey !== null);
  const withoutKey = rows.filter((row) => row.dedupeKey === null);
  if (withKey.length > 0) {
    await db.notification.createMany({ data: withKey, skipDuplicates: true });
  }
  if (withoutKey.length > 0) {
    await db.notification.createMany({ data: withoutKey });
  }
}

/** 로그인하지 않았거나 알 수 없는 경우의 안전한 기본 화면. */
export function notificationFallbackPath(user: { adminRole: string | null; memberType: string }) {
  if (isAdmin(user)) return "/admin";
  if (user.memberType === "PARTNER") return "/partner";
  return "/my";
}

/**
 * 알림의 internalPath를 실제로 이동해도 되는 경로로 정리한다. 여기서는
 * "같은 출처 상대경로인가"만 검증한다 — 그 경로에 실제 접근 가능한지는
 * 목적지 페이지 자신이 항상 다시 검사하므로(이 저장소 모든 보호 페이지의
 * 기존 원칙, requireAdmin/requirePartnerMembership/소유자 확인 등) 알림
 * 링크 자체가 권한을 주는 일은 없다 — 권한이 회수된 뒤에는 이동해도 그
 * 페이지에서 다시 막힌다.
 */
export function resolveNotificationPath(
  internalPath: string,
  user: { adminRole: string | null; memberType: string },
) {
  return sanitizeReturnTo(internalPath, notificationFallbackPath(user));
}
