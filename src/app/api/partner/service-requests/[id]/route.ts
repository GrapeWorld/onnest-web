import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isPartnerStaff } from "@/lib/partnerAuth";
import { serviceRequestStatuses, serviceRequestCancelledStatus } from "@/data/serviceRequests";

const updateSchema = z
  .object({
    status: z.enum(serviceRequestStatuses, { error: "상태를 선택해주세요." }),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === serviceRequestCancelledStatus && !data.reason?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["reason"],
        message: "취소 사유를 입력해주세요.",
      });
    }
  });

/** 업체 포털 — 배정된 요청의 진행 상태 변경(수락=확인 중 진입, 거절/취소=사유 필수). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isPartnerStaff(user)) {
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
  const { status, reason } = parsed.data;

  let result: { error: "notfound" | "same" | null };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.serviceRequest.findUnique({
          where: { id },
          select: { id: true, status: true, partnerId: true },
        });
        // 다른 업체 소속이거나 아예 없는 요청은 같은 404로 처리해 존재
        // 여부를 노출하지 않는다 — 다른 업체 요청은 절대 볼 수 없어야 한다.
        if (!existing || existing.partnerId !== user.partnerId) {
          return { error: "notfound" as const };
        }
        if (existing.status === status) {
          return { error: "same" as const };
        }

        await tx.serviceRequest.update({ where: { id }, data: { status } });
        await tx.serviceRequestActivity.create({
          data: {
            serviceRequestId: id,
            action: "STATUS_CHANGED",
            changes: {
              from: existing.status,
              to: status,
              ...(reason ? { reason } : {}),
            },
            actorId: user.id,
            actorEmail: user.email,
            actorName: user.name,
            actorRole: "PARTNER",
          },
        });
        return { error: null };
      },
      { isolationLevel: "Serializable" },
    );
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json(
      { error: "요청을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "same") {
    return NextResponse.json(
      { error: "이미 같은 상태입니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id, status });
}
