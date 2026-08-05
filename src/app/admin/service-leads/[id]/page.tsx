import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { formatFileSize } from "@/lib/documents";
import { serviceStatusClassName } from "@/data/serviceRequests";
import {
  serviceRequestActivityActionLabels,
  serviceRequestActorRoleLabels,
  type ServiceRequestActivityAction,
  type ServiceRequestActorRole,
} from "@/data/serviceRequestActivity";
import { serviceRequestFileCategoryLabels } from "@/data/serviceRequestFiles";
import { formatWon } from "@/lib/currency";

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
    default:
      return entry.action;
  }
}

/** 관리자 전용 — 배정된 업체가 남긴 처리 현황(상태·메모·연락기록·파일)을 읽기 전용으로 본다. */
export default async function AdminServiceLeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const admin = await getCurrentUser();
  if (!admin) notFound();

  const { id } = await params;
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    select: {
      id: true,
      serviceType: true,
      status: true,
      region: true,
      contactName: true,
      contactPhone: true,
      createdAt: true,
      project: { select: { name: true, spaceType: true } },
      partner: { select: { name: true } },
      partnerStaff: { select: { name: true } },
      selectedQuoteId: true,
    },
  });
  if (!request) notFound();

  const [activities, quotes, files] = await Promise.all([
    prisma.serviceRequestActivity.findMany({
      where: { serviceRequestId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.serviceRequestQuote.findMany({
      where: { serviceRequestId: id },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        createdByName: true,
      },
    }),
    prisma.document.findMany({
      where: { serviceRequestId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        filename: true,
        category: true,
        size: true,
        uploadedByRole: true,
        uploadedByName: true,
      },
    }),
  ]);

  const canDownload = isSuperAdmin(admin);

  return (
    <AppShell
      title={`${request.serviceType} 요청 — 업체 처리 현황`}
      description="배정된 업체가 남긴 상태·메모·연락기록·파일을 읽기 전용으로 확인합니다."
    >
      <Link
        href="/admin/service-leads"
        className="mb-6 inline-block text-sm font-semibold text-forest hover:underline"
      >
        ← 서비스 리드 목록으로
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
                  {request.contactName} · {request.contactPhone}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">배정 업체</dt>
                <dd className="font-semibold text-forest">{request.partner?.name ?? "미배정"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">업체 담당 직원</dt>
                <dd className="font-semibold text-forest">{request.partnerStaff?.name ?? "미배정"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">접수일</dt>
                <dd className="font-semibold text-forest">{formatDate(request.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">가격 옵션</h2>
            {quotes.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">등록된 견적이 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {quotes.map((quote) => {
                  const selected = quote.id === request.selectedQuoteId;
                  return (
                    <li
                      key={quote.id}
                      className={`rounded-2xl px-4 py-3 text-sm ${selected ? "bg-forest/10" : "bg-cream"}`}
                    >
                      <p className="font-semibold text-forest">
                        {quote.title} · {formatWon(quote.amount)}원
                        {selected && (
                          <span className="ml-2 rounded-full bg-forest px-2 py-0.5 text-xs font-bold text-white">
                            고객 선택
                          </span>
                        )}
                      </p>
                      {quote.description && (
                        <p className="mt-1 whitespace-pre-wrap text-ink/65">{quote.description}</p>
                      )}
                      {quote.createdByName && (
                        <p className="mt-1 text-xs text-ink/45">{quote.createdByName}</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">첨부 파일</h2>
            {files.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">업로드된 파일이 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {files.map((file) => (
                  <li
                    key={file.id}
                    className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-forest">
                        {file.category
                          ? `[${serviceRequestFileCategoryLabels[file.category as keyof typeof serviceRequestFileCategoryLabels] ?? file.category}] `
                          : ""}
                        {file.filename}
                      </p>
                      <p className="mt-0.5 text-xs text-ink/50">
                        {formatFileSize(file.size)} ·{" "}
                        {file.uploadedByRole === "PARTNER" ? "업체" : "고객"}
                        {file.uploadedByName ? ` (${file.uploadedByName})` : ""}
                      </p>
                    </div>
                    {canDownload && (
                      <a
                        href={`/api/partner/service-requests/${id}/files/${file.id}`}
                        className="shrink-0 text-xs font-semibold text-forest hover:underline"
                      >
                        내려받기
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
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
          <Card className="border border-dashed border-forest/20 bg-transparent">
            <p className="text-sm text-ink/50">
              상태·담당자·업체 배정 변경은{" "}
              <Link href="/admin/service-leads" className="font-semibold text-forest hover:underline">
                서비스 리드 목록
              </Link>
              에서 합니다. 이 화면은 배정된 업체가 남긴 처리 현황을 읽기 전용으로 보여줍니다.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
