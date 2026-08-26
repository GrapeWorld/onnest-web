import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { MemberStatusChangeForm } from "@/components/app/MemberStatusChangeForm";
import { MemberNoteForm } from "@/components/app/MemberNoteForm";
import { MemberNoteItem } from "@/components/app/MemberNoteItem";
import { MemberTypeChangeForm } from "@/components/app/MemberTypeChangeForm";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import {
  memberStatusClassName,
  memberStatusLabels,
  type MemberStatus,
} from "@/data/memberStatus";
import { adminRoleLabels, type AdminRole } from "@/data/adminRole";
import {
  memberClassificationLabels,
  memberClassificationClassName,
  memberTypeLabels,
  getMemberClassification,
  type MemberType,
} from "@/data/memberType";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      status: true,
      adminRole: true,
      memberType: true,
      partnerId: true,
      partner: {
        select: { id: true, name: true, serviceType: true, active: true },
      },
      createdAt: true,
      lastLoginAt: true,
      termsAgreedAt: true,
      projects: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          spaceType: true,
          projectStage: true,
          createdAt: true,
          handover: { select: { id: true } },
          _count: { select: { requests: true } },
        },
      },
    },
  });

  if (!user) notFound();

  const [statusHistory, notes, memberTypeHistory, partners] = await Promise.all([
    prisma.memberStatusHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        reason: true,
        adminEmail: true,
        createdAt: true,
      },
    }),
    prisma.adminMemberNote.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        body: true,
        authorEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.memberTypeHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        fromType: true,
        toType: true,
        fromPartnerId: true,
        toPartnerId: true,
        reason: true,
        actorEmail: true,
        createdAt: true,
      },
    }),
    prisma.partner.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      select: { id: true, name: true, serviceType: true, active: true },
    }),
  ]);

  const status = user.status as MemberStatus;
  const classification = getMemberClassification(user);
  const partnerNameById = new Map(partners.map((partner) => [partner.id, partner.name]));

  return (
    <AppShell
      title={user.name}
      description="회원 상세 정보와 상태·메모를 관리합니다."
    >
      <Link
        href="/admin/users"
        className="mb-6 inline-block text-sm font-semibold text-forest hover:underline"
      >
        ← 회원 목록으로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-forest">기본 정보</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${memberStatusClassName[status] ?? "bg-cream text-forest"}`}
              >
                {memberStatusLabels[status] ?? user.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink/50">이메일</dt>
                <dd className="font-semibold text-forest">{user.email}</dd>
              </div>
              <div>
                <dt className="text-ink/50">휴대폰</dt>
                <dd className="font-semibold text-forest">
                  {user.phone ?? "-"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">관리자 권한</dt>
                <dd className="font-semibold text-forest">
                  {user.adminRole
                    ? adminRoleLabels[user.adminRole as AdminRole]
                    : "일반 회원"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">회원 구분</dt>
                <dd>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${memberClassificationClassName[classification]}`}
                  >
                    {memberClassificationLabels[classification]}
                  </span>
                  {classification === "PARTNER" && user.partner && (
                    <span className="ml-2 text-sm font-semibold text-forest">
                      {user.partner.name} ({user.partner.serviceType})
                      {!user.partner.active && (
                        <span className="ml-1 text-ink/50">— 비활성 업체</span>
                      )}
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">가입일</dt>
                <dd className="font-semibold text-forest">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">최근 로그인</dt>
                <dd className="font-semibold text-forest">
                  {user.lastLoginAt
                    ? dateTimeFormatter.format(user.lastLoginAt)
                    : "로그인 기록 없음"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">약관 동의</dt>
                <dd className="font-semibold text-forest">
                  {user.termsAgreedAt
                    ? dateTimeFormatter.format(user.termsAgreedAt)
                    : "기록 없음"}
                </dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">보유 프로젝트</h2>
            {user.projects.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">
                생성한 프로젝트가 없습니다.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {user.projects.map((project) => (
                  <li
                    key={project.id}
                    className="rounded-2xl bg-cream px-4 py-3 text-sm"
                  >
                    <Link
                      href={`/admin/projects/${project.id}`}
                      className="font-semibold text-forest hover:underline"
                    >
                      {project.name} →
                    </Link>
                    <p className="mt-1 text-ink/60">
                      {project.spaceType}
                      {project.projectStage && ` · ${project.projectStage}`}
                      {" · "}
                      {formatDate(project.createdAt)} 생성
                    </p>
                    <p className="mt-1 text-ink/60">
                      인수인계서 {project.handover ? "있음" : "없음"} · 서비스
                      신청 {project._count.requests}건
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">상태 변경 이력</h2>
            {statusHistory.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">
                아직 상태를 변경한 기록이 없습니다.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {statusHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl bg-cream px-4 py-3 text-sm"
                  >
                    <p className="font-semibold text-forest">
                      {memberStatusLabels[entry.fromStatus as MemberStatus] ??
                        entry.fromStatus}{" "}
                      →{" "}
                      {memberStatusLabels[entry.toStatus as MemberStatus] ??
                        entry.toStatus}
                    </p>
                    <p className="mt-1 text-ink/70">{entry.reason}</p>
                    <p className="mt-1 text-xs text-ink/50">
                      {entry.adminEmail} ·{" "}
                      {dateTimeFormatter.format(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">회원 구분 변경 이력</h2>
            {memberTypeHistory.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">
                아직 회원 구분을 변경한 기록이 없습니다.
              </p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {memberTypeHistory.map((entry) => (
                  <li
                    key={entry.id}
                    className="rounded-2xl bg-cream px-4 py-3 text-sm"
                  >
                    <p className="font-semibold text-forest">
                      {memberTypeLabels[entry.fromType as MemberType] ?? entry.fromType}
                      {entry.fromPartnerId &&
                        ` (${partnerNameById.get(entry.fromPartnerId) ?? "알 수 없는 업체"})`}
                      {" → "}
                      {memberTypeLabels[entry.toType as MemberType] ?? entry.toType}
                      {entry.toPartnerId &&
                        ` (${partnerNameById.get(entry.toPartnerId) ?? "알 수 없는 업체"})`}
                    </p>
                    <p className="mt-1 text-ink/70">{entry.reason}</p>
                    <p className="mt-1 text-xs text-ink/50">
                      {entry.actorEmail} · {dateTimeFormatter.format(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="border border-dashed border-forest/20 bg-transparent">
            <p className="text-sm text-ink/50">
              본인인증 여부, 가입 경로, 회원별 문의 내역은 아직 시스템에 연결된
              데이터가 없어 이 화면에 표시하지 않습니다.
            </p>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <h2 className="text-xl font-black text-forest">상태 변경</h2>
            <div className="mt-4">
              {canEdit ? (
                <MemberStatusChangeForm userId={user.id} currentStatus={status} />
              ) : (
                <ViewerReadOnlyNotice />
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">회원 구분 변경</h2>
            <div className="mt-4">
              {canEdit ? (
                <MemberTypeChangeForm
                  userId={user.id}
                  currentType={user.memberType as MemberType}
                  currentPartnerId={user.partnerId}
                  partners={partners}
                />
              ) : (
                <ViewerReadOnlyNotice>
                  조회전용 관리자는 회원 구분을 변경할 수 없습니다.
                </ViewerReadOnlyNotice>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">관리자 메모</h2>
            <div className="mt-4">
              {canEdit ? (
                <MemberNoteForm userId={user.id} />
              ) : (
                <ViewerReadOnlyNotice>
                  조회전용 관리자는 메모를 작성·수정할 수 없습니다.
                </ViewerReadOnlyNotice>
              )}
            </div>
            {notes.length === 0 ? (
              <p className="mt-4 text-sm text-ink/55">작성된 메모가 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {notes.map((note) => (
                  <li key={note.id}>
                    <MemberNoteItem
                      noteId={note.id}
                      body={note.body}
                      authorEmail={note.authorEmail}
                      timestamp={dateTimeFormatter.format(
                        note.updatedAt > note.createdAt
                          ? note.updatedAt
                          : note.createdAt,
                      )}
                      canEdit={canEdit}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
