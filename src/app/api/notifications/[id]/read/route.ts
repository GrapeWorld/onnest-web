import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { resolveNotificationPath } from "@/lib/notifications";

/**
 * 알림 하나를 읽음 처리하고, 안전하게 이동해도 되는 내부 경로를 돌려준다.
 * 실제로 그 경로에 접근할 수 있는지는 여기서 다시 검사하지 않는다 —
 * 목적지 페이지 자신이 항상 현재 사용자 권한을 다시 검사하므로(이 저장소
 * 모든 보호 페이지의 기존 원칙), 알림 링크 자체가 권한을 주는 일은 없다.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await params;
  const notification = await prisma.notification.findUnique({
    where: { id },
    select: { id: true, recipientUserId: true, internalPath: true, readAt: true },
  });
  // 본인 소유가 아니면 존재 여부를 노출하지 않고 404로 처리한다.
  if (!notification || notification.recipientUserId !== user.id) {
    return NextResponse.json({ error: "알림을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!notification.readAt) {
    await prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({
    redirectTo: resolveNotificationPath(notification.internalPath, user),
  });
}
