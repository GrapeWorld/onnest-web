import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { PartnerStatusChangeForm } from "@/components/app/PartnerStatusChangeForm";
import { PartnerStaffAssignForm } from "@/components/app/PartnerStaffAssignForm";
import { PartnerRequestNoteForm } from "@/components/app/PartnerRequestNoteForm";
import { PartnerRequestContactLogForm } from "@/components/app/PartnerRequestContactLogForm";
import { PartnerRequestFileUpload } from "@/components/app/PartnerRequestFileUpload";
import { PartnerRequestFileList } from "@/components/app/PartnerRequestFileList";
import { PartnerQuoteForm } from "@/components/app/PartnerQuoteForm";
import { PartnerQuoteList } from "@/components/app/PartnerQuoteList";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import { requirePartnerMembership, evaluateServiceRequestReadAccess } from "@/lib/partnerAuth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { isQuoteMutableStatus } from "@/lib/serviceRequestQuotes";
import { serviceStatusClassName, type ServiceRequestStatus } from "@/data/serviceRequests";
import {
  serviceRequestActivityActionLabels,
  serviceRequestActorRoleLabels,
  type ServiceRequestActivityAction,
  type ServiceRequestActorRole,
} from "@/data/serviceRequestActivity";
import { formatWon } from "@/lib/currency";

const partnerNav: [string, string][] = [
  ["요청 목록", "/partner"],
  ["팀 관리", "/partner/team"],
  ["업체 정보", "/partner/company"],
];

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

type ActivityRow = {
  id: string;
  action: string;
  changes: unknown;
  note: string | null;
  actorName: string | null;
  actorRole: string;
  createdAt: Date;
};

function activityBody(entry: ActivityRow) {
  const changes = (entry.changes ?? {}) as Record<string, string | null>;

  switch (entry.action as ServiceRequestActivityAction) {
    case "STATUS_CHANGED":
      return `${changes.from ?? "-"} → ${changes.to ?? "-"}${changes.reason ? ` · 사유: ${changes.reason}` : ""}`;
    case "STAFF_ASSIGNED":
      return `담당 직원이 지정되었습니다: ${changes.toStaffName ?? "알 수 없음"}`;
    case "STAFF_UNASSIGNED":
      return "담당 직원이 해제되었습니다.";
    case "NOTE_ADDED":
      return entry.note ?? "";
    case "CONTACT_LOGGED":
      return `[${changes.method ?? "-"}] ${changes.result ?? ""}${
        changes.contactedAt ? ` · ${dateTimeFormatter.format(new Date(changes.contactedAt))}` : ""
      }${changes.followUp ? ` · 후속조치: ${changes.followUp}` : ""}`;
    case "QUOTE_ADDED":
      return `${changes.title ?? "-"} · ${formatWon(Number(changes.amount ?? 0))}원 등록`;
    case "QUOTE_REMOVED":
      return `${changes.title ?? "-"} · ${formatWon(Number(changes.amount ?? 0))}원 삭제`;
    case "QUOTE_SELECTED":
      return `고객이 "${changes.title ?? "-"}" (${formatWon(Number(changes.amount ?? 0))}원)을 선택했습니다.`;
    case "CANCEL_REQUESTED":
      return entry.note || "고객이 취소를 요청했습니다.";
    default:
      return entry.action;
  }
}

export default async function PartnerRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, membership } = await requirePartnerMembership();
  const { id } = await params;

  const request = await prisma.serviceRequest.findFirst({
    where: { id, partnerId: user.partnerId },
    select: {
      id: true,
      serviceType: true,
      status: true,
      region: true,
      message: true,
      preferredDate: true,
      contactName: true,
      contactPhone: true,
      partnerId: true,
      partnerStaffId: true,
      privacyAgreedAt: true,
      createdAt: true,
      selectedQuoteId: true,
      project: { select: { name: true, spaceType: true } },
      review: { select: { rating: true, comment: true, createdAt: true } },
    },
  });
  // 다른 업체 소속이거나 존재하지 않는 요청은 같은 404로 처리한다 —
  // 다른 업체 요청은 절대 볼 수 없어야 한다. STAFF가 담당하지 않은 건도
  // 같은 404로 처리해 존재 자체를 숨긴다.
  if (!request || !evaluateServiceRequestReadAccess(membership, user.id, request)) notFound();

  const canWrite =
    membership.role === "OWNER" || membership.role === "MANAGER" || request.partnerStaffId === user.id;
  const canManageStaff = membership.role === "OWNER" || membership.role === "MANAGER";

  const [activities, staffOptions, files, quotes] = await Promise.all([
    prisma.serviceRequestActivity.findMany({
      // 재배정 전 다른 업체가 남긴 내부 메모·연락 기록이 보이지 않도록
      // 작성 당시 담당 업체(partnerId) 스냅샷으로도 스코프를 좁힌다.
      where: { serviceRequestId: id, partnerId: user.partnerId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { partnerId: user.partnerId, memberType: "PARTNER", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.document.findMany({
      // 재배정 전 다른 업체가 올린 견적서·계약서·사진이 보이지 않도록
      // 업로드 당시 담당 업체(partnerId) 스냅샷으로도 스코프를 좁힌다.
      where: { serviceRequestId: id, partnerId: user.partnerId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        category: true,
        size: true,
        createdAt: true,
        uploadedByRole: true,
        uploadedByName: true,
      },
    }),
    prisma.serviceRequestQuote.findMany({
      where: { serviceRequestId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        createdAt: true,
        createdByName: true,
      },
    }),
  ]);

  const quoteMutable = isQuoteMutableStatus(request.status);

  return (
    <AppShell
      title={`${request.serviceType} 요청`}
      description="고객 정보와 처리 상태를 관리합니다."
      navItems={partnerNav}
    >
      <Link href="/partner" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 요청 목록으로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-forest">요청 정보</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${serviceStatusClassName[request.status] ?? "bg-cream text-forest"}`}
              >
                {request.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink/50">프로젝트</dt>
                <dd className="font-semibold text-forest">
                  {request.project.name} ({request.project.spaceType})
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">지역</dt>
                <dd className="font-semibold text-forest">{request.region}</dd>
              </div>
              <div>
                <dt className="text-ink/50">고객 연락처</dt>
                <dd className="font-semibold text-forest">
                  {request.privacyAgreedAt
                    ? `${request.contactName} · ${request.contactPhone}`
                    : "동의 대기 중"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">희망일</dt>
                <dd className="font-semibold text-forest">
                  {request.preferredDate ? formatDate(request.preferredDate) : "미정"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">개인정보 동의</dt>
                <dd className="font-semibold text-forest">
                  {request.privacyAgreedAt
                    ? dateTimeFormatter.format(request.privacyAgreedAt)
                    : "동의 기록 없음"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">접수일</dt>
                <dd className="font-semibold text-forest">
                  {dateTimeFormatter.format(request.createdAt)}
                </dd>
              </div>
            </dl>
            {request.message && (
              <div className="mt-4">
                <p className="text-sm text-ink/50">고객 메시지</p>
                <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-cream px-4 py-3 text-sm leading-7 text-ink/70">
                  {request.message}
                </p>
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">가격 옵션</h2>
            <p className="mt-1 text-sm text-ink/55">
              고객이 비교하고 선택할 수 있도록 견적 옵션을 등록합니다.
            </p>
            <div className="mt-4">
              <PartnerQuoteList
                requestId={request.id}
                quotes={quotes.map((quote) => ({
                  ...quote,
                  createdAt: dateTimeFormatter.format(quote.createdAt),
                }))}
                selectedQuoteId={request.selectedQuoteId}
                locked={!quoteMutable}
              />
            </div>
            {!canWrite ? (
              <div className="mt-4">
                <ViewerReadOnlyNotice>조회전용 계정은 견적을 등록할 수 없습니다.</ViewerReadOnlyNotice>
              </div>
            ) : quoteMutable ? (
              <div className="mt-4">
                <PartnerQuoteForm requestId={request.id} />
              </div>
            ) : (
              <p className="mt-4 text-sm text-ink/50">이 상태에서는 견적을 추가할 수 없습니다.</p>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">첨부 파일</h2>
            <p className="mt-1 text-sm text-ink/55">견적서·작업 사진·계약서를 올립니다.</p>
            <div className="mt-4">
              {canWrite ? (
                <PartnerRequestFileUpload requestId={request.id} />
              ) : (
                <ViewerReadOnlyNotice>조회전용 계정은 파일을 올릴 수 없습니다.</ViewerReadOnlyNotice>
              )}
            </div>
            <div className="mt-4">
              <PartnerRequestFileList
                requestId={request.id}
                files={files.map((file) => ({ ...file, createdAt: file.createdAt.toISOString() }))}
              />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">처리 이력</h2>
            {activities.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">아직 활동 기록이 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {activities.map((entry) => (
                  <li key={entry.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                    <p className="font-semibold text-forest">
                      {serviceRequestActivityActionLabels[
                        entry.action as ServiceRequestActivityAction
                      ] ?? entry.action}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-ink/70">{activityBody(entry)}</p>
                    <p className="mt-1 text-xs text-ink/50">
                      {serviceRequestActorRoleLabels[entry.actorRole as ServiceRequestActorRole] ??
                        entry.actorRole}
                      {entry.actorName ? ` · ${entry.actorName}` : ""} ·{" "}
                      {dateTimeFormatter.format(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-6">
          {request.review && (
            <Card>
              <h2 className="text-xl font-black text-forest">고객 후기</h2>
              <p className="mt-2 text-lg text-amber-500">
                {"★".repeat(request.review.rating)}
                <span className="text-ink/20">{"★".repeat(5 - request.review.rating)}</span>
              </p>
              {request.review.comment && (
                <p className="mt-2 whitespace-pre-wrap text-sm text-ink/70">{request.review.comment}</p>
              )}
              <p className="mt-2 text-xs text-ink/50">{dateTimeFormatter.format(request.review.createdAt)}</p>
            </Card>
          )}

          <Card>
            <h2 className="text-xl font-black text-forest">상태 처리</h2>
            <div className="mt-4">
              {canWrite ? (
                <PartnerStatusChangeForm
                  requestId={request.id}
                  currentStatus={request.status as ServiceRequestStatus}
                />
              ) : (
                <ViewerReadOnlyNotice>조회전용 계정은 상태를 변경할 수 없습니다.</ViewerReadOnlyNotice>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">담당 직원</h2>
            <div className="mt-4">
              {canManageStaff ? (
                <PartnerStaffAssignForm
                  requestId={request.id}
                  currentStaffId={request.partnerStaffId}
                  staffOptions={staffOptions}
                />
              ) : (
                <ViewerReadOnlyNotice>대표·매니저만 담당자를 지정할 수 있습니다.</ViewerReadOnlyNotice>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">내부 메모</h2>
            <div className="mt-4">
              {canWrite ? (
                <PartnerRequestNoteForm requestId={request.id} />
              ) : (
                <ViewerReadOnlyNotice>조회전용 계정은 메모를 남길 수 없습니다.</ViewerReadOnlyNotice>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">연락 기록</h2>
            <div className="mt-4">
              {canWrite ? (
                <PartnerRequestContactLogForm requestId={request.id} />
              ) : (
                <ViewerReadOnlyNotice>조회전용 계정은 연락 기록을 남길 수 없습니다.</ViewerReadOnlyNotice>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
