import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { AdminRoleChangeForm } from "@/components/app/AdminRoleChangeForm";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminRoleClassName, adminRoleLabels, type AdminRole } from "@/data/adminRole";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function AdminDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireSuperAdmin();
  const { id } = await params;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, email: true, adminRole: true, createdAt: true },
  });
  if (!target) notFound();

  const [roleHistory, recentExports] = await Promise.all([
    prisma.adminRoleHistory.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      select: { id: true, fromRole: true, toRole: true, reason: true, actorEmail: true, createdAt: true },
    }),
    // "최근 관리자 활동" 대리 지표 — 이 관리자가 실행한 Excel 내보내기 이력.
    prisma.adminDataExportHistory.findMany({
      where: { actorId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, exportType: true, status: true, reason: true, createdAt: true },
    }),
  ]);

  const isSelf = target.id === me.id;

  return (
    <AppShell title={target.name} description="관리자 계정의 권한 이력과 최근 활동을 확인합니다.">
      <Link href="/admin/admins" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 관리자 계정 관리로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-forest">기본 정보</h2>
              {target.adminRole && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${adminRoleClassName[target.adminRole as AdminRole]}`}
                >
                  {adminRoleLabels[target.adminRole as AdminRole]}
                </span>
              )}
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink/50">이메일</dt>
                <dd className="font-semibold text-forest">{target.email}</dd>
              </div>
              <div>
                <dt className="text-ink/50">가입일</dt>
                <dd className="font-semibold text-forest">{dateTimeFormatter.format(target.createdAt)}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">권한 변경 이력</h2>
            {roleHistory.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">아직 권한을 변경한 기록이 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {roleHistory.map((entry) => (
                  <li key={entry.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                    <p className="font-semibold text-forest">
                      {entry.fromRole ? (adminRoleLabels[entry.fromRole as AdminRole] ?? entry.fromRole) : "일반 회원"}
                      {" → "}
                      {entry.toRole ? (adminRoleLabels[entry.toRole as AdminRole] ?? entry.toRole) : "일반 회원(회수)"}
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

          <Card>
            <h2 className="text-xl font-black text-forest">최근 데이터 내보내기 활동</h2>
            {recentExports.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">최근 내보내기 기록이 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {recentExports.map((entry) => (
                  <li key={entry.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                    <p className="font-semibold text-forest">
                      {entry.exportType === "CUSTOMER" ? "고객 전체" : "프로젝트 1건"} ·{" "}
                      {entry.status === "SUCCESS" ? "성공" : "실패"}
                    </p>
                    <p className="mt-1 text-ink/70">{entry.reason}</p>
                    <p className="mt-1 text-xs text-ink/50">{dateTimeFormatter.format(entry.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <h2 className="text-xl font-black text-forest">권한 변경</h2>
            <div className="mt-4">
              {isSelf ? (
                <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink/55">
                  자기 자신의 권한은 이 화면에서 변경할 수 없습니다. 다른 최고관리자에게 요청해주세요.
                </p>
              ) : (
                <AdminRoleChangeForm
                  userId={target.id}
                  currentRole={target.adminRole as AdminRole | null}
                  targetName={target.name}
                />
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
