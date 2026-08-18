import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  partnerVerificationStatuses,
  isVerificationReasonRequired,
} from "@/data/partnerVerification";

const updateSchema = z
  .object({
    toStatus: z.enum(partnerVerificationStatuses, { error: "변경할 상태를 선택해주세요." }),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (isVerificationReasonRequired(data.toStatus) && !data.reason?.trim()) {
      ctx.addIssue({ code: "custom", path: ["reason"], message: "사유를 입력해주세요." });
    }
  });

/** 관리자 전용 — 업체 검증 상태 변경(검토 대기/승인/반려/이용 중지). */
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

  let result: { error: "notfound" | "same" | null };
  try {
    result = await prisma.$transaction(async (tx) => {
      const existing = await tx.partner.findUnique({
        where: { id },
        select: { id: true, verificationStatus: true },
      });
      if (!existing) return { error: "notfound" as const };
      if (existing.verificationStatus === toStatus) return { error: "same" as const };

      await tx.partner.update({
        where: { id },
        data: {
          verificationStatus: toStatus,
          verificationReason: reason || null,
          verifiedAt: new Date(),
          verifiedById: admin.id,
          verifiedByName: admin.name,
        },
      });
      await tx.partnerVerificationHistory.create({
        data: {
          partnerId: id,
          fromStatus: existing.verificationStatus,
          toStatus,
          reason: reason || null,
          actorId: admin.id,
          actorEmail: admin.email,
          actorName: admin.name,
        },
      });
      return { error: null };
    });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json({ error: "업체를 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "same") {
    return NextResponse.json({ error: "이미 같은 상태입니다." }, { status: 400 });
  }

  return NextResponse.json({ id, verificationStatus: toStatus });
}
