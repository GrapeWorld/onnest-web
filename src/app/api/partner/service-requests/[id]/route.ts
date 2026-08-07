import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership, evaluateServiceRequestWriteAccess } from "@/lib/partnerAuth";
import { isValidStatusTransition } from "@/lib/serviceRequestStatus";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import {
  serviceRequestStatuses,
  serviceRequestCancelledStatus,
  type ServiceRequestStatus,
} from "@/data/serviceRequests";

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
  const membership = user ? await getActiveMembership(user) : null;
  if (!user || !membership) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const limit = await checkRateLimit("partnerRequestStatus", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: `요청이 너무 많습니다. ${formatRetryAfter(limit.retryAfterSeconds)} 후에 다시 시도해주세요.` },
      { status: 429 },
    );
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

  let result: {
    error: "notfound" | "forbidden" | "same" | "invalid-transition" | null;
  };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.serviceRequest.findUnique({
          where: { id },
          select: { id: true, status: true, partnerId: true, partnerStaffId: true },
        });
        if (!existing) return { error: "notfound" as const };
        // VIEWER는 조회만 가능(권한 없음), STAFF가 담당하지 않은 건은
        // 존재 자체를 숨긴다 — 다른 업체 요청과 같은 원칙.
        const permission = evaluateServiceRequestWriteAccess(membership, user.id, existing);
        if (!permission.ok) return { error: permission.reason };
        if (existing.status === status) {
          return { error: "same" as const };
        }
        // 파트너 쪽에는 상태 전이 순서를 강제한다(관리자는 예외 —
        // admin/service-requests 라우트는 이 검사를 거치지 않는다).
        if (!isValidStatusTransition(existing.status as ServiceRequestStatus, status)) {
          return { error: "invalid-transition" as const };
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
            partnerId: user.partnerId,
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
  if (result.error === "forbidden") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }
  if (result.error === "same") {
    return NextResponse.json(
      { error: "이미 같은 상태입니다." },
      { status: 400 },
    );
  }
  if (result.error === "invalid-transition") {
    return NextResponse.json(
      { error: "이 상태로는 변경할 수 없습니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id, status });
}
