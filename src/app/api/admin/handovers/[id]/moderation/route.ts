import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { moderationStatuses } from "@/data/handoverModeration";

const updateSchema = z.object({
  toStatus: z.enum(moderationStatuses, { error: "변경할 상태를 선택해주세요." }),
  reason: z.string().trim().min(1, "처리 사유를 입력해주세요.").max(500),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { toStatus, reason } = parsed.data;

  const target = await prisma.handover.findUnique({
    where: { id },
    select: { id: true, moderationStatus: true },
  });
  if (!target) {
    return NextResponse.json(
      { error: "인수인계서를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  if (target.moderationStatus === toStatus) {
    return NextResponse.json(
      { error: "이미 같은 상태입니다." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.handover.update({
      where: { id },
      data: {
        moderationStatus: toStatus,
        moderationReason: reason,
        moderatedAt: new Date(),
        moderatorId: admin.id,
        moderatorEmail: admin.email,
        // 비공개 처리하면 기존 공유 링크를 즉시 무효화한다 — visibility를
        // 되돌리고 shareToken을 지워 링크를 알아도 열리지 않게 한다.
        ...(toStatus === "hidden" && { visibility: "private", shareToken: null }),
      },
    }),
    prisma.handoverModerationHistory.create({
      data: {
        handoverId: id,
        fromStatus: target.moderationStatus,
        toStatus,
        reason,
        actorId: admin.id,
        actorEmail: admin.email,
      },
    }),
  ]);

  return NextResponse.json({ id, moderationStatus: toStatus });
}
