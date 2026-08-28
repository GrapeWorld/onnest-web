import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { serviceRequestPatchSchema } from "@/lib/serviceRequestSchema";
import { escapeHtml, notifyPartnerStaff } from "@/lib/email";
import { getAppUrl } from "@/lib/appUrl";
import { isPartnerAssignable } from "@/data/partnerVerification";
import { createNotification, createNotifications } from "@/lib/notifications";
import {
  getServiceRequestCustomerNotification,
  getReadablePartnerRequestRecipients,
  getWritablePartnerRequestRecipients,
} from "@/lib/serviceRequestNotifications";
import { createActionItems, resolveActionItemsBySourceKey } from "@/lib/actionItems";
import { getServiceRequestActionItemPlan } from "@/lib/serviceRequestActionItems";
import type { ServiceRequestStatus } from "@/data/serviceRequests";

/** 관리자 전용 상태·담당자·업체 배정 변경 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isSuperAdmin(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = serviceRequestPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;

  // 상태·업체·이전 업체 견적 정리를 한 트랜잭션으로 묶는다 — 분리돼
  // 있으면 update()는 성공하고 이어지는 deleteMany()만 실패했을 때 요청은
  // 새 업체로 넘어갔는데 이전 업체 견적은 그대로 남는, 이전에 고친 P0
  // (재배정 시 이전 업체 데이터 유출)와 같은 종류의 문제가 재현된다.
  let result: {
    error: "notfound" | "invalid-partner" | "privacy-not-agreed" | null;
    data?: {
      updated: { id: string; status: string; owner: string | null; partnerId: string | null };
      serviceType: string;
      isNewPartnerAssignment: boolean;
    };
  };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.serviceRequest.findUnique({
          where: { id },
          select: {
            id: true,
            serviceType: true,
            status: true,
            partnerId: true,
            partnerStaffId: true,
            privacyAgreedAt: true,
            cancelRequestedAt: true,
            preferredDate: true,
            projectId: true,
            project: { select: { userId: true } },
          },
        });
        if (!existing) return { error: "notfound" as const };

        if (parsed.data.partnerId) {
          // 고객이 연락처 공유에 동의하지 않은(레거시 신청 등) 건은 업체에
          // 배정할 수 없다 — 배정되는 순간 파트너 포털에 이름·전화번호가
          // 그대로 노출되기 때문이다.
          if (!existing.privacyAgreedAt) {
            return { error: "privacy-not-agreed" as const };
          }
          const partner = await tx.partner.findUnique({
            where: { id: parsed.data.partnerId },
            select: { active: true, serviceType: true, verificationStatus: true },
          });
          if (
            !partner ||
            !isPartnerAssignable(partner) ||
            partner.serviceType !== existing.serviceType
          ) {
            return { error: "invalid-partner" as const };
          }
        }

        const data: typeof parsed.data & {
          selectedQuoteId?: null;
          selectedAt?: null;
          partnerStaffId?: null;
          cancelRequestedAt?: null;
          cancelRequestReason?: null;
        } = {
          ...parsed.data,
        };

        // 관리자가 상태를 바꾸면(취소 확정이든, 계속 진행이든) 고객이 남긴
        // 취소 요청은 처리된 것으로 보고 지운다 — 그대로 두면 확인이
        // 끝난 뒤에도 "취소 요청 중"으로 계속 보인다.
        if (parsed.data.status !== undefined && existing.status !== parsed.data.status) {
          data.cancelRequestedAt = null;
          data.cancelRequestReason = null;
        }

        // 이전에 배정되지 않았던(또는 다른) 업체가 새로 배정되면 상태를
        // 그 업체 큐의 시작점인 "신규"로 되돌린다 — 다른 업체를 다시
        // 시도하는 정상적인 흐름이라 "취소"였던 건도 리셋된다. 다만 이미
        // "작업 완료"된 신청은 되돌리지 않는다.
        const isNewPartnerAssignment =
          parsed.data.partnerId != null && parsed.data.partnerId !== existing.partnerId;
        if (isNewPartnerAssignment && existing.status !== "작업 완료") {
          data.status = "신규";
        }

        // 업체가 바뀌거나(재배정) 해제되면 이전 업체의 견적이 그대로
        // 남아있지 않도록 정리한다 — 새로 배정된 업체 포털에 이전 업체의
        // 가격이 그대로 보이는 유출을 막는다. partnerId 필드 자체를 안
        // 보낸 요청(상태·담당자만 바꾸는 경우)은 건드리지 않는다.
        const partnerChanged =
          parsed.data.partnerId !== undefined && parsed.data.partnerId !== existing.partnerId;
        if (partnerChanged) {
          data.selectedQuoteId = null;
          data.selectedAt = null;
          // 이전 업체 직원 ID가 새 업체로 넘어간 요청에 그대로 남지
          // 않게 한다 — partnerStaffId는 이 PATCH 스키마에 없어서 원래는
          // 재배정돼도 절대 갱신되지 않았다.
          data.partnerStaffId = null;
        }

        const updated = await tx.serviceRequest.update({
          where: { id },
          data,
          select: { id: true, status: true, owner: true, partnerId: true, partnerStaffId: true },
        });

        // 관리자 라우트는 상태 머신 검증을 거치지 않지만(예외), 변경 자체는
        // 파트너 쪽과 마찬가지로 활동 이력에 남긴다 — 지금까지는 이 라우트가
        // 상태를 바꿔도(직접 변경이든 재배정에 의한 "신규" 리셋이든) 아무
        // 기록도 남지 않았다.
        if (updated.status !== existing.status) {
          await tx.serviceRequestActivity.create({
            data: {
              serviceRequestId: id,
              action: "STATUS_CHANGED",
              changes: { from: existing.status, to: updated.status },
              actorId: user.id,
              actorEmail: user.email,
              actorName: user.name,
              actorRole: "ADMIN",
              partnerId: updated.partnerId,
            },
          });

          const notification = getServiceRequestCustomerNotification({
            requestId: id,
            toStatus: updated.status as ServiceRequestStatus,
            hadPendingCancelRequest: Boolean(existing.cancelRequestedAt),
          });
          if (notification) {
            await createNotification(tx, {
              recipientUserId: existing.project.userId,
              type: notification.type,
              title: notification.title,
              body: notification.body,
              internalPath: `/projects/${existing.projectId}/services`,
              dedupeKey: notification.dedupeKey,
            });
          }

          const plan = getServiceRequestActionItemPlan({
            requestId: id,
            toStatus: updated.status as ServiceRequestStatus,
            hadPendingCancelRequest: Boolean(existing.cancelRequestedAt),
            isNewPartnerAssignment,
            preferredDate: existing.preferredDate,
          });
          for (const resolution of plan.resolutions) {
            await resolveActionItemsBySourceKey(tx, resolution.sourceKey, resolution.outcome);
          }
          if (plan.createForPartner && updated.partnerId) {
            const writableRecipients = await getWritablePartnerRequestRecipients(
              tx,
              updated.partnerId,
              updated.partnerStaffId,
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
        }

        if (partnerChanged) {
          await tx.serviceRequestQuote.deleteMany({ where: { serviceRequestId: id } });

          // 이전에 배정돼 있던 업체가 있었다면(재배정이든 배정 해제든) 더 이상
          // 접근할 수 없게 됐다는 사실을 그 시점에 조회 가능했던 구성원들에게
          // 알린다 — 접근 자체는 이미 evaluateServiceRequestReadAccess가
          // partnerId 일치 여부로 막아주지만(알림 링크를 눌러도 그 화면에서
          // 다시 막힌다), "왜 안 보이지"를 능동적으로 알려주는 게 목적이다.
          if (existing.partnerId) {
            const previousRecipients = await getReadablePartnerRequestRecipients(
              tx,
              existing.partnerId,
              existing.partnerStaffId,
            );
            await createNotifications(
              tx,
              previousRecipients.map((recipientUserId) => ({
                recipientUserId,
                type: "PARTNER_SERVICE_REQUEST_UNASSIGNED" as const,
                title: "다른 업체로 재배정되었습니다",
                body: "담당하시던 요청이 다른 업체로 재배정되어 더 이상 접근할 수 없습니다.",
                internalPath: "/partner",
                dedupeKey: `PARTNER_SERVICE_REQUEST_UNASSIGNED:${id}:${existing.partnerId}`,
              })),
            );
          }
        }

        if (isNewPartnerAssignment) {
          // 업체 배정 자체를 고객에게도 알린다(상태가 "신규"로 리셋되는 경우가
          // 많아 위 상태 변경 알림과는 겹치지 않는다 — "신규"에는 문구가 없다).
          await createNotification(tx, {
            recipientUserId: existing.project.userId,
            type: "SERVICE_REQUEST_PARTNER_ASSIGNED",
            title: "업체가 배정되었습니다",
            body: "신청하신 서비스에 업체가 배정되었습니다. 곧 확인 및 견적 안내가 진행됩니다.",
            internalPath: `/projects/${existing.projectId}/services`,
            dedupeKey: `SERVICE_REQUEST_PARTNER_ASSIGNED:${id}:${parsed.data.partnerId}`,
          });

          // 배정 시점에는 아직 담당 STAFF가 지정되지 않아(evaluateServiceRequestReadAccess
          // 기준) STAFF는 상세를 조회할 수 없다 — 지금 열람 가능한 OWNER·MANAGER·
          // VIEWER에게만 알린다. STAFF는 개별 배정 이후 포털에서 확인하게 된다.
          const recipients = await getReadablePartnerRequestRecipients(tx, parsed.data.partnerId!, null);
          await createNotifications(
            tx,
            recipients.map((recipientUserId) => ({
              recipientUserId,
              type: "PARTNER_NEW_SERVICE_REQUEST" as const,
              title: "새로운 서비스 요청이 배정되었습니다",
              body: "요청 내용을 확인하고 필요한 경우 견적을 등록해 주세요.",
              internalPath: `/partner/requests/${id}`,
              dedupeKey: `PARTNER_NEW_SERVICE_REQUEST:${id}:${parsed.data.partnerId}`,
            })),
          );
        }

        return {
          error: null,
          data: { updated, serviceType: existing.serviceType, isNewPartnerAssignment },
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
      { error: "신청을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "invalid-partner") {
    return NextResponse.json(
      { error: "배정할 수 없는 업체입니다." },
      { status: 400 },
    );
  }
  if (result.error === "privacy-not-agreed") {
    return NextResponse.json(
      { error: "고객이 개인정보 제공에 동의하지 않은 신청은 업체에 배정할 수 없습니다." },
      { status: 400 },
    );
  }

  const { updated, serviceType, isNewPartnerAssignment } = result.data!;

  // 새 업체가 배정되면 그 업체의 활성 직원 전원에게 알린다(아직 담당
  // 직원이 지정되지 않은 시점이라 특정 1인에게 보낼 수 없다 — 담당 직원
  // 지정은 업체 포털에서 이후에 한다). 알림 발송(또는 URL 조립) 실패가
  // 이미 저장된 배정 응답을 막지 않는다.
  if (isNewPartnerAssignment) {
    try {
      const staff = await prisma.user.findMany({
        where: { partnerId: parsed.data.partnerId!, memberType: "PARTNER", status: "ACTIVE" },
        select: { email: true },
      });
      const portalUrl = new URL(
        `/partner/requests/${id}`,
        getAppUrl(),
      ).toString();
      await notifyPartnerStaff({
        to: staff.map((member) => member.email),
        subject: "[ONNEST] 새 서비스 요청이 배정되었습니다",
        html: `
          <p>새 서비스 요청이 배정되었습니다.</p>
          <ul>
            <li>서비스 유형: ${escapeHtml(serviceType)}</li>
          </ul>
          <p><a href="${portalUrl}">업체 포털에서 확인하기</a></p>
        `,
      });
    } catch (error) {
      console.error("[email] service request assignment notification failed", error);
    }
  }

  return NextResponse.json(updated);
}
