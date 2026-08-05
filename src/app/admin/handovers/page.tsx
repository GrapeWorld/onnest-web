import Link from "next/link";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { HandoverModerationForm } from "@/components/app/HandoverModerationForm";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import {
  moderationStatuses,
  moderationStatusClassName,
  moderationStatusLabels,
  type ModerationStatus,
} from "@/data/handoverModeration";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

const PAGE_SIZE = 20;

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
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

export default async function AdminHandoversPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const params = await searchParams;
  const status =
    params.status && moderationStatuses.includes(params.status as ModerationStatus)
      ? (params.status as ModerationStatus)
      : "";
  const page = Math.max(1, Number(params.page) || 1);

  const where = status ? { moderationStatus: status } : {};

  const [totalCount, allStatusCounts, handovers] = await Promise.all([
    prisma.handover.count({ where }),
    prisma.handover.groupBy({ by: ["moderationStatus"], _count: { _all: true } }),
    prisma.handover.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        items: { select: { label: true, note: true } },
        project: {
          select: {
            name: true,
            spaceType: true,
            user: { select: { email: true } },
          },
        },
        moderationHistory: {
          orderBy: { createdAt: "desc" },
          select: {
            fromStatus: true,
            toStatus: true,
            reason: true,
            actorEmail: true,
            createdAt: true,
          },
        },
      },
    }),
  ]);

  const sharedCount = await prisma.handover.count({ where: { visibility: "link" } });
  const totalHandovers = allStatusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const pendingCount =
    allStatusCounts.find((row) => row.moderationStatus === "pending")?._count._all ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <AppShell
      title="인수인계서 검수"
      description="작성된 인수인계서 내용을 검수하고 공개 상태를 관리합니다. 금칙 표현은 저장 시 서버에서 1차로 걸러집니다."
    >
      <MetricGrid
        items={[
          ["전체 인수인계서", `${totalHandovers}건`],
          ["검토 대기", `${pendingCount}건`],
          ["공유 중", `${sharedCount}건`],
          [
            "항목 메모",
            `${handovers.reduce((sum, h) => sum + h.items.length, 0)}건`,
          ],
        ]}
      />

      <div className="mb-6 mt-6 flex flex-wrap gap-2 text-sm">
        <Link
          href="/admin/handovers"
          className={`rounded-full px-4 py-2 font-semibold ${
            !status ? "bg-forest text-white" : "border border-forest/15 text-forest hover:bg-cream"
          }`}
        >
          전체
        </Link>
        {moderationStatuses.map((option) => (
          <Link
            key={option}
            href={`/admin/handovers?status=${option}`}
            className={`rounded-full px-4 py-2 font-semibold ${
              status === option
                ? "bg-forest text-white"
                : "border border-forest/15 text-forest hover:bg-cream"
            }`}
          >
            {moderationStatusLabels[option]}
          </Link>
        ))}
      </div>

      {!canEdit && (
        <div className="mb-6">
          <ViewerReadOnlyNotice>
            조회전용 관리자 모드입니다 — 검수 상태 변경은 최고관리자만 할 수 있습니다.
          </ViewerReadOnlyNotice>
        </div>
      )}

      <section>
        <p className="mb-3 text-sm text-ink/55">
          검색 결과 {totalCount.toLocaleString()}건
          {status && ` · ${moderationStatusLabels[status]}`}
        </p>

        {handovers.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold text-forest">
              조건에 맞는 인수인계서가 없습니다.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5">
            {handovers.map((handover) => {
              const moderationStatus = handover.moderationStatus as ModerationStatus;
              return (
                <Card key={handover.id} className="p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${moderationStatusClassName[moderationStatus] ?? "bg-cream text-forest"}`}
                    >
                      {moderationStatusLabels[moderationStatus] ?? handover.moderationStatus}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        handover.visibility === "link"
                          ? "bg-navy text-white"
                          : "bg-cream text-forest"
                      }`}
                    >
                      {handover.visibility === "link" ? "공유 중" : "비공개"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sage ring-1 ring-forest/10">
                      {handover.project.spaceType}
                    </span>
                    <span className="text-sm text-ink/55">
                      수정: {formatDate(handover.updatedAt)}
                    </span>
                  </div>

                  <h3 className="mt-4 text-lg font-black text-forest">
                    {handover.project.name}
                  </h3>
                  <p className="mt-1 break-all text-sm text-ink/55">
                    {handover.project.user.email}
                  </p>

                  <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-cream/70 p-4 text-sm leading-7 text-ink/70">
                    {handover.summary}
                  </p>

                  {handover.items.length > 0 && (
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {handover.items.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-forest/10"
                        >
                          <p className="text-xs font-bold text-sage">
                            {item.label}
                          </p>
                          <p className="mt-1 text-ink/70">{item.note}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 grid gap-4 border-t border-forest/10 pt-5 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 text-sm font-bold text-forest">검수 처리</h4>
                      {canEdit ? (
                        <HandoverModerationForm
                          handoverId={handover.id}
                          currentStatus={moderationStatus}
                        />
                      ) : (
                        <ViewerReadOnlyNotice />
                      )}
                    </div>
                    <div>
                      <h4 className="mb-2 text-sm font-bold text-forest">검수 이력</h4>
                      {handover.moderationHistory.length === 0 ? (
                        <p className="text-sm text-ink/55">
                          아직 검수 처리 기록이 없습니다.
                        </p>
                      ) : (
                        <ul className="grid gap-2">
                          {handover.moderationHistory.map((entry, index) => (
                            <li
                              key={index}
                              className="rounded-2xl bg-cream px-4 py-3 text-sm"
                            >
                              <p className="font-semibold text-forest">
                                {moderationStatusLabels[entry.fromStatus as ModerationStatus] ??
                                  entry.fromStatus}{" "}
                                →{" "}
                                {moderationStatusLabels[entry.toStatus as ModerationStatus] ??
                                  entry.toStatus}
                              </p>
                              <p className="mt-1 text-ink/70">{entry.reason}</p>
                              <p className="mt-1 text-xs text-ink/50">
                                {entry.actorEmail} ·{" "}
                                {dateTimeFormatter.format(entry.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ul>
                      )}
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
                  href={`/admin/handovers${buildQuery({ status, page: pageNumber === 1 ? undefined : String(pageNumber) })}`}
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
