import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { InquiryFilterBar } from "@/components/app/InquiryFilterBar";
import { InquiryUpdateForm } from "@/components/app/InquiryUpdateForm";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import { inquiryStatuses, inquiryTypes, statusClassName } from "@/data/inquiries";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isRealDate } from "@/lib/dateField";
import { kstDateStringToUtc } from "@/lib/dates";
import { getInquiryWarning, openInquiryStatuses } from "@/lib/inquirySla";

const PAGE_SIZE = 20;

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
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

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    assignee?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status = params.status && inquiryStatuses.includes(params.status as (typeof inquiryStatuses)[number])
    ? params.status
    : "";
  const type = params.type && inquiryTypes.includes(params.type) ? params.type : "";
  // "" 전체 | "unassigned" 미배정 | 그 외 값 = 특정 관리자 id
  const assignee = params.assignee?.trim() ?? "";
  const from = params.from && isRealDate(params.from) ? params.from : "";
  const to = params.to && isRealDate(params.to) ? params.to : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.InquiryWhereInput = {};
  if (status) where.status = status;
  if (type) where.type = type;
  if (assignee === "unassigned") where.assigneeId = null;
  else if (assignee) where.assigneeId = assignee;
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: kstDateStringToUtc(from) }),
      // to는 "그 날의 끝"이 아니라 "다음 날 서울 자정 미만"으로 표현한다 —
      // 서울 기준 하루 전체를 밀리초 경계 오류 없이 정확히 포함한다.
      ...(to && { lt: new Date(kstDateStringToUtc(to).getTime() + 24 * 60 * 60 * 1000) }),
    };
  }
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
      { organization: { contains: q, mode: "insensitive" } },
      { message: { contains: q, mode: "insensitive" } },
    ];
  }

  const [totalCount, allStatusCounts, openInquiriesForWarnings, inquiries, admins] = await Promise.all([
    prisma.inquiry.count({ where }),
    prisma.inquiry.groupBy({ by: ["status"], _count: { _all: true } }),
    // 배지·지연 카운트는 처리기한 필드 없이 접수일 기준으로만 판단하므로
    // 페이지네이션과 무관하게 열려 있는 문의 전체를 가볍게 조회한다.
    prisma.inquiry.findMany({
      where: { status: { in: openInquiryStatuses } },
      select: { status: true, assigneeId: true, createdAt: true },
    }),
    prisma.inquiry.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        name: true,
        organization: true,
        email: true,
        phone: true,
        type: true,
        region: true,
        spaceType: true,
        message: true,
        status: true,
        nextAction: true,
        createdAt: true,
        assignee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.user.findMany({
      where: { adminRole: { not: null } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const totalInquiries = allStatusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const newCount = allStatusCounts.find((row) => row.status === "신규")?._count._all ?? 0;
  const reviewing = allStatusCounts.find((row) => row.status === "검토 중")?._count._all ?? 0;
  const assignedToPartner =
    allStatusCounts.find((row) => row.status === "파트너 배정")?._count._all ?? 0;
  const overdueCount = openInquiriesForWarnings.filter((inquiry) => getInquiryWarning(inquiry)).length;

  const baseParams = { q, status, type, assignee, from, to };

  return (
    <AppShell
      title="문의 접수함"
      description="개인 고객, 사무실·공장 확인 요청, 제휴 문의를 한곳에서 보고 상태와 다음 액션을 관리합니다."
    >
      <MetricGrid
        items={[
          ["전체 문의", `${totalInquiries}건`],
          ["신규", `${newCount}건`],
          ["검토 중", `${reviewing}건`],
          ["파트너 배정", `${assignedToPartner}건`],
          ["지연 경고", `${overdueCount}건`],
        ]}
      />

      <Card className="mb-6 mt-6">
        <InquiryFilterBar
          initialQuery={q}
          initialStatus={status}
          initialType={type}
          initialAssignee={assignee}
          initialFrom={from}
          initialTo={to}
          admins={admins}
        />
      </Card>

      {!canEdit && (
        <div className="mb-6">
          <ViewerReadOnlyNotice>
            조회전용 관리자 모드입니다 — 상태·담당자·다음 액션 변경은 최고관리자만 할 수 있습니다.
          </ViewerReadOnlyNotice>
        </div>
      )}

      <p className="mb-3 text-sm text-ink/55">
        검색 결과 {totalCount.toLocaleString()}건
        {q && ` · 검색어 "${q}"`}
        {status && ` · 상태 ${status}`}
        {type && ` · 유형 ${type}`}
        {assignee === "unassigned" && " · 미배정"}
        {assignee &&
          assignee !== "unassigned" &&
          ` · 담당 ${admins.find((admin) => admin.id === assignee)?.name ?? assignee}`}
        {(from || to) && ` · 접수 ${from || "…"} ~ ${to || "…"}`}
      </p>

      {inquiries.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">
            조건에 맞는 문의가 없습니다.
          </p>
        </Card>
      ) : (
        <div className="grid gap-5">
          {inquiries.map((inquiry) => {
            const warning = getInquiryWarning({
              status: inquiry.status,
              assigneeId: inquiry.assignee?.id ?? null,
              createdAt: inquiry.createdAt,
            });
            const warningLabel = warning
              ? [
                  warning.unassigned && `미배정 ${warning.daysOpen}일째`,
                  warning.unreviewed && `미검토 ${warning.daysOpen}일째`,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : null;

            return (
            <Card key={inquiry.id} className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[inquiry.status] ?? "bg-cream text-forest"}`}
                    >
                      {inquiry.status}
                    </span>
                    {inquiry.spaceType && (
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sage ring-1 ring-forest/10">
                        {inquiry.spaceType}
                      </span>
                    )}
                    {warningLabel && (
                      <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                        ⚠ {warningLabel}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-4 text-xl font-black text-forest">
                    {inquiry.name} · {inquiry.type}
                  </h2>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink/65">
                    {inquiry.message}
                  </p>
                </div>
                <div className="flex min-w-64 flex-col gap-2 text-sm text-ink/65">
                  <p>
                    담당:{" "}
                    {inquiry.assignee
                      ? `${inquiry.assignee.name} (${inquiry.assignee.email})`
                      : "미배정"}
                  </p>
                  {canEdit ? (
                    <InquiryUpdateForm
                      inquiryId={inquiry.id}
                      status={inquiry.status}
                      nextAction={inquiry.nextAction}
                    />
                  ) : (
                    <p>다음 액션: {inquiry.nextAction ?? "-"}</p>
                  )}
                  <span>접수: {dateFormatter.format(inquiry.createdAt)}</span>
                  <Link
                    href={`/admin/inquiries/${inquiry.id}`}
                    className="font-semibold text-forest hover:underline"
                  >
                    상세보기 · 담당자·메모·연락기록 →
                  </Link>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-2xl bg-cream/70 p-4 text-sm md:grid-cols-4">
                <div>
                  <p className="font-bold text-forest">소속</p>
                  <p className="mt-1 text-ink/65">{inquiry.organization ?? "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-forest">지역</p>
                  <p className="mt-1 text-ink/65">{inquiry.region ?? "-"}</p>
                </div>
                <div>
                  <p className="font-bold text-forest">이메일</p>
                  <p className="mt-1 break-all text-ink/65">{inquiry.email}</p>
                </div>
                <div>
                  <p className="font-bold text-forest">연락처</p>
                  <p className="mt-1 text-ink/65">{inquiry.phone}</p>
                </div>
              </div>
            </Card>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map(
            (pageNumber) => (
              <Link
                key={pageNumber}
                href={`/admin/inquiries${buildQuery({ ...baseParams, page: pageNumber === 1 ? undefined : String(pageNumber) })}`}
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
    </AppShell>
  );
}
