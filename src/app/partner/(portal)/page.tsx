import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { PartnerRequestFilterBar } from "@/components/app/PartnerRequestFilterBar";
import { requirePartnerMembership } from "@/lib/partnerAuth";
import { prisma } from "@/lib/prisma";
import { serviceRequestStatuses, serviceStatusClassName } from "@/data/serviceRequests";
import { getOpenActionItemSummary } from "@/lib/actionItemQueries";
import { TaskSummaryCard } from "@/components/app/TaskSummaryCard";

const PAGE_SIZE = 20;
const partnerNav: [string, string][] = [
  ["요청 목록", "/partner"],
  ["팀 관리", "/partner/team"],
  ["업체 정보", "/partner/company"],
];

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

export default async function PartnerPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; staff?: string; page?: string }>;
}) {
  const { user, membership } = await requirePartnerMembership();
  const partnerId = user.partnerId;

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status =
    params.status &&
    serviceRequestStatuses.includes(params.status as (typeof serviceRequestStatuses)[number])
      ? params.status
      : "";
  // "" 전체 | "unassigned" 미배정 | 그 외 값 = 같은 업체 소속 직원 id
  const staff = params.staff?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.ServiceRequestWhereInput = { partnerId };
  if (status) where.status = status;
  // STAFF는 담당 건만 본다 — staff 쿼리 파라미터로 다른 직원·미배정을
  // 골라 우회하지 못하도록 역할 분기를 마지막에 둬 항상 덮어쓴다.
  if (membership.role === "STAFF") {
    where.partnerStaffId = user.id;
  } else if (staff === "unassigned") {
    where.partnerStaffId = null;
  } else if (staff) {
    where.partnerStaffId = staff;
  }
  if (q) {
    where.OR = [
      { contactName: { contains: q, mode: "insensitive" } },
      { contactPhone: { contains: q } },
      { region: { contains: q, mode: "insensitive" } },
      { project: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [totalCount, allStatusCounts, requests, staffOptions] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.serviceRequest.groupBy({
      // 상단 상태별 집계도 목록과 같은 스코프여야 한다 — 안 그러면 STAFF가
      // 자기 담당이 아닌 건수까지 집계로 보게 된다.
      where: membership.role === "STAFF" ? { partnerId, partnerStaffId: user.id } : { partnerId },
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.serviceRequest.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        project: { select: { name: true, spaceType: true } },
        partnerStaff: { select: { id: true, name: true } },
      },
    }),
    prisma.user.findMany({
      where: { partnerId, memberType: "PARTNER", status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const countByStatus = serviceRequestStatuses.map(
    (statusOption): [string, string] => [
      statusOption,
      `${allStatusCounts.find((row) => row.status === statusOption)?._count._all ?? 0}건`,
    ],
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const baseParams = { q, status, staff };
  const taskSummary = await getOpenActionItemSummary(user.id, "PARTNER");

  return (
    <AppShell
      title="업체 포털"
      description="우리 업체에 배정된 서비스 요청을 확인하고 처리합니다."
      navItems={partnerNav}
    >
      <div className="mb-6">
        <TaskSummaryCard
          count={taskSummary.count}
          items={taskSummary.items}
          emptyMessage="지금 처리할 업무가 없습니다."
        />
      </div>

      <MetricGrid items={countByStatus} />

      <Card className="mb-6 mt-6">
        <PartnerRequestFilterBar
          initialQuery={q}
          initialStatus={status}
          initialStaff={staff}
          staffOptions={staffOptions}
        />
      </Card>

      <p className="mb-3 text-sm text-ink/55">
        검색 결과 {totalCount.toLocaleString()}건
        {q && ` · 검색어 "${q}"`}
        {status && ` · 상태 ${status}`}
        {staff === "unassigned" && " · 미배정"}
        {staff &&
          staff !== "unassigned" &&
          ` · 담당 ${staffOptions.find((option) => option.id === staff)?.name ?? staff}`}
      </p>

      {requests.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">배정된 요청이 없습니다.</p>
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
                        serviceStatusClassName[request.status] ?? "bg-cream text-forest"
                      }`}
                    >
                      {request.status}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sage ring-1 ring-forest/10">
                      {request.project.spaceType}
                    </span>
                  </div>
                  <h3 className="mt-4 text-xl font-black text-forest">{request.serviceType}</h3>
                  <p className="mt-1 break-words text-sm text-ink/60">{request.project.name}</p>
                </div>

                <div className="flex min-w-64 flex-col gap-1 text-sm text-ink/65">
                  <span>
                    고객:{" "}
                    {request.privacyAgreedAt
                      ? `${request.contactName} · ${request.contactPhone}`
                      : "동의 대기 중"}
                  </span>
                  <span>담당 직원: {request.partnerStaff?.name ?? "미배정"}</span>
                  <span>접수: {receivedFormatter.format(request.createdAt)}</span>
                  <Link
                    href={`/partner/requests/${request.id}`}
                    className="mt-2 font-semibold text-forest hover:underline"
                  >
                    상세보기 →
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <Link
              key={pageNumber}
              href={`/partner${buildQuery({ ...baseParams, page: pageNumber === 1 ? undefined : String(pageNumber) })}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                pageNumber === page ? "bg-forest text-white" : "bg-white text-forest/70 hover:bg-cream"
              }`}
            >
              {pageNumber}
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
