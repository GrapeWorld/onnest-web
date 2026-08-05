import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { eventPatchSchema } from "@/lib/eventSchema";

/**
 * 일정이 로그인한 사용자의 프로젝트에 속하는지 확인한다.
 * projectId와 userId를 함께 걸어 남의 일정은 조회되지 않게 한다.
 */
async function findOwnedEvent(
  eventId: string,
  projectId: string,
  userId: string,
) {
  return prisma.projectEvent.findFirst({
    where: { id: eventId, projectId, project: { userId } },
    select: { id: true },
  });
}

/** 완료 토글 또는 제목·날짜·메모 수정 (필드는 모두 선택적) */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = eventPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "잘못된 요청입니다." },
      { status: 400 },
    );
  }

  const { id, eventId } = await params;
  const event = await findOwnedEvent(eventId, id, user.id);
  if (!event) {
    return NextResponse.json(
      { error: "일정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const { title, date, memo, done } = parsed.data;
  const updated = await prisma.projectEvent.update({
    where: { id: eventId },
    data: {
      ...(title !== undefined && { title }),
      ...(date !== undefined && { date: new Date(date) }),
      ...(memo !== undefined && { memo: memo || null }),
      ...(done !== undefined && { done }),
    },
    select: { id: true, title: true, date: true, memo: true, done: true },
  });

  return NextResponse.json(updated);
}

/** 일정 삭제 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; eventId: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { id, eventId } = await params;
  const event = await findOwnedEvent(eventId, id, user.id);
  if (!event) {
    return NextResponse.json(
      { error: "일정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  await prisma.projectEvent.delete({ where: { id: eventId } });

  return NextResponse.json({ id: eventId });
}
