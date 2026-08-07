import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { ServiceLeadFilterBar } from "@/components/app/ServiceLeadFilterBar";
import { ServiceRequestUpdateForm } from "@/components/app/ServiceRequestUpdateForm";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import {
  serviceRequestStatuses,
  serviceTypes,
  serviceStatusClassName,
} from "@/data/serviceRequests";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

const PAGE_SIZE = 20;

const receivedFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export default async function AdminServiceLeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    partnerAssigned?: string;
    ownerAssigned?: string;
    partnerId?: string;
    page?: string;
  }>;
}) {
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status =
    params.status && serviceRequestStatuses.includes(
      params.status as (typeof serviceRequestStatuses)[number],
    )
      ? params.status
      : "";
  const type =
    params.type && serviceTypes.includes(params.type as (typeof serviceTypes)[number])
      ? params.type
      : "";
  const partnerAssigned =
    params.partnerAssigned === "assigned" || params.partnerAssigned === "unassigned"
      ? params.partnerAssigned
      : "";
  const ownerAssigned =
    params.ownerAssigned === "assigned" || params.ownerAssigned === "unassigned"
      ? params.ownerAssigned
      : "";
  const partnerId = params.partnerId?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.ServiceRequestWhereInput = {};
  if (status) where.status = status;
  if (type) where.serviceType = type;
  if (partnerAssigned === "assigned") where.partnerId = { not: null };
  if (partnerAssigned === "unassigned") where.partnerId = null;
  if (ownerAssigned === "assigned") where.owner = { not: null };
  if (ownerAssigned === "unassigned") where.owner = null;
  if (partnerId) where.partnerId = partnerId;
  if (q) {
    where.OR = [
      { contactName: { contains: q, mode: "insensitive" } },
      { contactPhone: { contains: q } },
      { region: { contains: q, mode: "insensitive" } },
      { project: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [totalCount, allStatusCounts, requests, activePartners, filterPartner] =
    await Promise.all([
      prisma.serviceRequest.count({ where }),
      prisma.serviceRequest.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.serviceRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          project: {
            select: {
              name: true,
              spaceType: true,
              user: { select: { email: true } },
            },
          },
          partner: { select: { name: true } },
          partnerStaff: { select: { name: true } },
        },
      }),
      prisma.partner.findMany({
        where: { active: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, serviceType: true },
      }),
      partnerId
        ? prisma.partner.findUnique({ where: { id: partnerId }, select: { name: true } })
        : Promise.resolve(null),
    ]);

  const countByStatus = serviceRequestStatuses.map(
    (statusOption): [string, string] => [
      statusOption,
      `${allStatusCounts.find((row) => row.status === statusOption)?._count._all ?? 0}건`,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const baseParams = { q, status, type, partnerAssigned, ownerAssigned, partnerId };

  return (
    <AppShell
      title="서비스 리드 관리"
      description="이사, 청소, 인터넷, 보수, 인테리어 파트너 연결 요청의 처리 상태를 확인합니다."
    >
      <MetricGrid items={countByStatus} />

      {!canEdit && (
        <div className="mt-6">
          <ViewerReadOnlyNotice>
            조회전용 관리자 모드입니다 — 상태·담당자·파트너 변경은 최고관리자만 할 수 있습니다.
          </ViewerReadOnlyNotice>
        </div>
      )}

      <Card className="mb-6 mt-6">
        <ServiceLeadFilterBar
          initialQuery={q}
          initialStatus={status}
          initialType={type}
          initialPartnerAssigned={partnerAssigned}
          initialOwnerAssigned={ownerAssigned}
        />
      </Card>

      <section>
        <p className="mb-3 text-sm text-ink/55">
          검색 결과 {totalCount.toLocaleString()}건
          {q && ` · 검색어 "${q}"`}
          {status && ` · 상태 ${status}`}
          {type && ` · 서비스 유형 ${type}`}
          {filterPartner && (
            <>
              {" "}
              ·{" "}
              <Link href="/admin/service-leads" className="underline">
                파트너 &quot;{filterPartner.name}&quot; 필터 해제
              </Link>
            </>
          )}
        </p>

        {requests.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold text-forest">
              조건에 맞는 서비스 신청이 없습니다.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5">
            {requests.map((request) => (
              <Card key={request.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          serviceStatusClassName[request.status] ??
                          "bg-cream text-forest"
                        }`}
                      >
                        {request.status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sage ring-1 ring-forest/10">
                        {request.project.spaceType}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-forest">
                      {request.serviceType}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60">
                      {request.project.name}
                    </p>
                    {request.message && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/65">
                        {request.message}
                      </p>
                    )}
                  </div>

                  <div className="flex min-w-64 flex-col gap-2 text-sm text-ink/65">
                    {canEdit ? (
                      <ServiceRequestUpdateForm
                        requestId={request.id}
                        status={request.status}
                        owner={request.owner}
                        partnerId={request.partnerId}
                        partnerOptions={activePartners.filter(
                          (partner) => partner.serviceType === request.serviceType,
                        )}
                        currentAdminEmail={currentAdmin?.email ?? ""}
                        privacyAgreed={Boolean(request.privacyAgreedAt)}
                      />
                    ) : (
                      <>
                        <span>담당 업체: {request.partner?.name ?? "미배정"}</span>
                        <span>담당: {request.owner ?? "미배정"}</span>
                      </>
                    )}
                    <span>업체 담당 직원: {request.partnerStaff?.name ?? "미배정"}</span>
                    <span>
                      접수: {receivedFormatter.format(request.createdAt)}
                    </span>
                    <span>
                      개인정보 동의:{" "}
                      {request.privacyAgreedAt
                        ? receivedFormatter.format(request.privacyAgreedAt)
                        : "동의 기록 없음"}
                    </span>
                    <Link
                      href={`/admin/service-leads/${request.id}`}
                      className="font-semibold text-forest hover:underline"
                    >
                      업체 처리 현황 보기 →
                    </Link>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-cream/70 p-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="font-bold text-forest">희망일</p>
                    <p className="mt-1 text-ink/65">
                      {request.preferredDate
                        ? formatDate(request.preferredDate)
                        : "미정"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-forest">지역</p>
                    <p className="mt-1 text-ink/65">{request.region}</p>
                  </div>
                  <div>
                    <p className="font-bold text-forest">연락처</p>
                    <p className="mt-1 text-ink/65">
                      {request.contactName} · {request.contactPhone}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-forest">신청 계정</p>
                    <p className="mt-1 break-all text-ink/65">
                      {request.project.user.email}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <Link
                  key={pageNumber}
                  href={`/admin/service-leads${buildQuery({ ...baseParams, page: pageNumber === 1 ? undefined : String(pageNumber) })}`}
                  className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                    pageNumber === page
                      ? "bg-forest text-white"
                      : "bg-white text-forest/70 hover:bg-cream"
                  }`}
                >
                  {pageNumber}
                </Link>
              ),
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
