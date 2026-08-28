import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveMembership, evaluateServiceRequestWriteAccess } from "@/lib/partnerAuth";
import { isValidStatusTransition } from "@/lib/serviceRequestStatus";
import { checkRateLimit, formatRetryAfter } from "@/lib/rateLimit";
import { escapeHtml, notifyServiceRequestCustomer } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import {
  getCustomerNotificationCopy,
  getServiceRequestCustomerNotification,
} from "@/lib/serviceRequestNotifications";
import { createNotification, createNotifications } from "@/lib/notifications";
import { createActionItems, resolveActionItemsBySourceKey } from "@/lib/actionItems";
import { getServiceRequestActionItemPlan } from "@/lib/serviceRequestActionItems";
import { getWritablePartnerRequestRecipients } from "@/lib/serviceRequestNotifications";
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
    success?: {
      serviceType: string;
      projectId: string;
      customer: { email: string; name: string } | null;
    };
  };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.serviceRequest.findUnique({
          where: { id },
          select: {
            id: true,
            status: true,
            partnerId: true,
            partnerStaffId: true,
            serviceType: true,
            cancelRequestedAt: true,
            preferredDate: true,
            project: { select: { id: true, user: { select: { id: true, email: true, name: true } } } },
          },
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

        await tx.serviceRequest.update({
          where: { id },
          // 업체가 상태를 바꾸면 고객이 남긴 취소 요청은 처리된 것으로 보고
          // 지운다(관리자 라우트와 같은 원칙).
          data: { status, cancelRequestedAt: null, cancelRequestReason: null },
        });
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

        const notification = getServiceRequestCustomerNotification({
          requestId: id,
          toStatus: status,
          hadPendingCancelRequest: Boolean(existing.cancelRequestedAt),
        });
        if (notification) {
          await createNotification(tx, {
            recipientUserId: existing.project.user.id,
            type: notification.type,
            title: notification.title,
            body: notification.body,
            internalPath: `/projects/${existing.project.id}/services`,
            dedupeKey: notification.dedupeKey,
          });
        }

        const plan = getServiceRequestActionItemPlan({
          requestId: id,
          toStatus: status,
          hadPendingCancelRequest: Boolean(existing.cancelRequestedAt),
          isNewPartnerAssignment: false,
          preferredDate: existing.preferredDate,
        });
        for (const resolution of plan.resolutions) {
          await resolveActionItemsBySourceKey(tx, resolution.sourceKey, resolution.outcome);
        }
        if (plan.createForPartner && existing.partnerId) {
          const writableRecipients = await getWritablePartnerRequestRecipients(
            tx,
            existing.partnerId,
            existing.partnerStaffId,
          );
          await createActionItems(
            tx,
            writableRecipients.map((assigneeUserId) => ({
              assigneeUserId,
              type: plan.createForPartner!.type,
              title: plan.createForPartner!.title,
              description: plan.createForPartner!.description,
              internalPath: `/partner/requests/${id}`,
              relatedEntityType: "ServiceRequest",
              relatedEntityId: id,
              sourceKey: plan.createForPartner!.sourceKey,
              dueAt: plan.createForPartner!.dueAt,
            })),
          );
        }

        // 업체가 자발적으로(고객이 남긴 취소 요청을 처리하는 게 아니라)
        // 요청을 취소로 돌리면 사실상 "거절"이다 — 관리자가 다른 업체를
        // 다시 찾아야 할 수 있으니 알린다.
        if (status === serviceRequestCancelledStatus && !existing.cancelRequestedAt) {
          const admins = await tx.user.findMany({
            where: { adminRole: { in: ["super", "viewer"] } },
            select: { id: true },
          });
          await createNotifications(
            tx,
            admins.map((adminUser) => ({
              recipientUserId: adminUser.id,
              type: "ADMIN_PARTNER_REJECTED" as const,
              title: "업체가 요청을 거절했습니다",
              body: `${existing.serviceType} 서비스 신청을 업체가 거절했습니다. 재배정이 필요할 수 있습니다.`,
              internalPath: "/admin/service-leads",
              dedupeKey: `ADMIN_PARTNER_REJECTED:${id}:${existing.partnerId}`,
            })),
          );
        }

        return {
          error: null,
          success: {
            serviceType: existing.serviceType,
            projectId: existing.project.id,
            customer: existing.project.user,
          },
        };
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

  const notifyCopy = getCustomerNotificationCopy(status);
  if (result.success?.customer && notifyCopy) {
    try {
      const servicesUrl = new URL(
        `/projects/${result.success.projectId}/services`,
        getAppUrl(),
      ).toString();
      const { customer, serviceType } = result.success;
      await notifyServiceRequestCustomer({
        to: customer.email,
        subject: `[ONNEST] ${escapeHtml(serviceType)} ${notifyCopy.subject}`,
        html: `
          <p>안녕하세요, ${escapeHtml(customer.name)}님.</p>
          <p>${escapeHtml(serviceType)} 서비스 신청 상태가 변경되었습니다: ${escapeHtml(notifyCopy.body)}</p>
          ${status === serviceRequestCancelledStatus && reason ? `<p>취소 사유: ${escapeHtml(reason)}</p>` : ""}
          <p>로그인 후 신청 내역에서 자세한 내용을 확인해주세요.</p>
          <p><a href="${servicesUrl}">${servicesUrl}</a></p>
        `,
      });
    } catch (error) {
      console.error("[email] service request status customer notification failed", error);
    }
  }

  return NextResponse.json({ id, status });
}
