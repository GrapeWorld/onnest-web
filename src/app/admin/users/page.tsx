import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { MemberFilterBar } from "@/components/app/MemberFilterBar";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { maskEmail, maskPhone } from "@/lib/mask";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import {
  memberStatuses,
  memberStatusClassName,
  memberStatusLabels,
  type MemberStatus,
} from "@/data/memberStatus";
import { adminRoleLabels, type AdminRole } from "@/data/adminRole";
import {
  memberClassifications,
  memberClassificationLabels,
  memberClassificationClassName,
  getMemberClassification,
  type MemberClassification,
} from "@/data/memberType";

const PAGE_SIZE = 20;
const sortOptions = ["createdAt", "lastLoginAt"] as const;
type SortOption = (typeof sortOptions)[number];

function buildQuery(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    type?: string;
    sort?: string;
    page?: string;
  }>;
}) {
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const status =
    params.status && memberStatuses.includes(params.status as MemberStatus)
      ? (params.status as MemberStatus)
      : "";
  const type =
    params.type &&
    (memberClassifications as readonly string[]).includes(params.type)
      ? (params.type as MemberClassification)
      : "";
  const sort: SortOption = sortOptions.includes(params.sort as SortOption)
    ? (params.sort as SortOption)
    : "createdAt";
  const page = Math.max(1, Number(params.page) || 1);

  const where: Prisma.UserWhereInput = {};
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }
  if (type === "ADMIN") where.adminRole = { not: null };
  else if (type === "PARTNER") {
    where.adminRole = null;
    where.memberType = "PARTNER";
  } else if (type === "CUSTOMER") {
    where.adminRole = null;
    where.memberType = "CUSTOMER";
  }

  const [totalCount, allStatusCounts, users, adminCount, partnerCount, customerCount] =
    await Promise.all([
      prisma.user.count({ where }),
      prisma.user.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.user.findMany({
        where,
        orderBy: { [sort]: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          adminRole: true,
          memberType: true,
          createdAt: true,
          lastLoginAt: true,
          partner: { select: { name: true, active: true } },
          _count: { select: { projects: true } },
        },
      }),
      prisma.user.count({ where: { adminRole: { not: null } } }),
      prisma.user.count({ where: { adminRole: null, memberType: "PARTNER" } }),
      prisma.user.count({ where: { adminRole: null, memberType: "CUSTOMER" } }),
    ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const totalMembers = allStatusCounts.reduce((sum, row) => sum + row._count._all, 0);
  const suspendedCount =
    allStatusCounts.find((row) => row.status === "SUSPENDED")?._count._all ?? 0;
  const withdrawnCount =
    allStatusCounts.find((row) => row.status === "WITHDRAWN")?._count._all ?? 0;

  const baseParams = {
    q,
    status,
    type,
    sort: sort === "createdAt" ? undefined : sort,
  };
  const exportHref = `/api/admin/users/export${buildQuery({ q, status, type })}`;

  return (
    <AppShell
      title="회원 관리"
      description="가입자 검색·상태 관리와 프로젝트 보유 현황을 확인합니다."
    >
      <MetricGrid
        items={[
          ["전체 회원", `${totalMembers}명`],
          ["관리자", `${adminCount}명`],
          ["업체", `${partnerCount}명`],
          ["고객", `${customerCount}명`],
          ["이용 정지", `${suspendedCount}명`],
          ["탈퇴", `${withdrawnCount}명`],
        ]}
      />

      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black text-forest">회원 목록</h2>
          <div className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/admin/users?status=SUSPENDED"
              className="rounded-full bg-navy px-4 py-2 font-semibold text-white hover:opacity-90"
            >
              이용 정지 회원
            </Link>
            <Link
              href="/admin/users?status=WITHDRAWN"
              className="rounded-full bg-ink/15 px-4 py-2 font-semibold text-ink/70 hover:bg-ink/25"
            >
              탈퇴 회원
            </Link>
            {canEdit && (
              <a
                href={exportHref}
                className="rounded-full border border-forest/15 px-4 py-2 font-semibold text-forest hover:bg-cream"
              >
                CSV 다운로드
              </a>
            )}
          </div>
        </div>

        <Card className="mb-6">
          <MemberFilterBar initialQuery={q} initialStatus={status} initialType={type} />
        </Card>

        <p className="mb-3 text-sm text-ink/55">
          검색 결과 {totalCount.toLocaleString()}명
          {q && ` · 검색어 "${q}"`}
          {status && ` · 상태 ${memberStatusLabels[status]}`}
          {type && ` · 구분 ${memberClassificationLabels[type]}`}
        </p>

        {users.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold text-forest">조건에 맞는 회원이 없습니다.</p>
          </Card>
        ) : (
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-forest text-white">
                  <tr>
                    <th className="p-4 font-semibold">이름</th>
                    <th className="p-4 font-semibold">이메일</th>
                    <th className="p-4 font-semibold">휴대폰</th>
                    <th className="p-4 font-semibold">회원 구분</th>
                    <th className="p-4 font-semibold">상태</th>
                    <th className="p-4 font-semibold">프로젝트</th>
                    <th className="p-4 font-semibold">
                      <Link
                        href={`/admin/users${buildQuery({ ...baseParams, sort: "createdAt" })}`}
                        className="hover:underline"
                      >
                        가입일
                      </Link>
                    </th>
                    <th className="p-4 font-semibold">
                      <Link
                        href={`/admin/users${buildQuery({ ...baseParams, sort: "lastLoginAt" })}`}
                        className="hover:underline"
                      >
                        최근 로그인
                      </Link>
                    </th>
                    <th className="p-4 font-semibold">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-forest/10 last:border-0"
                    >
                      <td className="p-4 font-semibold text-forest">
                        {user.name}
                      </td>
                      <td className="break-all p-4 text-ink/65">
                        {maskEmail(user.email)}
                      </td>
                      <td className="p-4 text-ink/65">
                        {user.phone ? maskPhone(user.phone) : "-"}
                      </td>
                      <td className="p-4">
                        {(() => {
                          const classification = getMemberClassification(user);
                          return (
                            <div>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${memberClassificationClassName[classification]}`}
                              >
                                {memberClassificationLabels[classification]}
                              </span>
                              {classification === "ADMIN" && user.adminRole && (
                                <p className="mt-1 text-xs text-ink/50">
                                  {adminRoleLabels[user.adminRole as AdminRole]}
                                </p>
                              )}
                              {classification === "PARTNER" && user.partner && (
                                <p className="mt-1 text-xs text-ink/50">
                                  {user.partner.name}
                                  {!user.partner.active && " (비활성 업체)"}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${memberStatusClassName[user.status as MemberStatus] ?? "bg-cream text-forest"}`}
                        >
                          {memberStatusLabels[user.status as MemberStatus] ?? user.status}
                        </span>
                      </td>
                      <td className="p-4 text-ink/65">
                        {user._count.projects}건
                      </td>
                      <td className="p-4 text-ink/65">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="p-4 text-ink/65">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "-"}
                      </td>
                      <td className="p-4">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="font-semibold text-forest hover:underline"
                        >
                          상세보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => index + 1).map(
              (pageNumber) => (
                <Link
                  key={pageNumber}
                  href={`/admin/users${buildQuery({ ...baseParams, page: pageNumber === 1 ? undefined : String(pageNumber) })}`}
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

        <p className="mt-4 text-sm text-ink/55">
          관리자 권한 부여·회수는{" "}
          <Link href="/admin/admins" className="font-semibold text-forest hover:underline">
            관리자 계정 관리
          </Link>
          에서 처리합니다.
        </p>
      </section>
    </AppShell>
  );
}
