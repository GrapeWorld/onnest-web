import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { AdminSearchBar } from "@/components/app/AdminSearchBar";
import { AdminRoleChangeForm } from "@/components/app/AdminRoleChangeForm";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskEmail, maskPhone } from "@/lib/mask";
import { adminRoleClassName, adminRoleLabels, type AdminRole } from "@/data/adminRole";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function AdminAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const me = await requireSuperAdmin();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const admins = await prisma.user.findMany({
    where: { adminRole: { not: null } },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      adminRole: true,
      roleHistory: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { actorEmail: true, createdAt: true },
      },
    },
  });

  let candidates: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  }[] = [];
  if (query) {
    const where: Prisma.UserWhereInput = {
      adminRole: null,
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    };
    candidates = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, name: true, email: true, phone: true },
    });
  }

  return (
    <AppShell
      title="관리자 계정 관리"
      description="관리자 권한을 가진 계정을 확인하고, 회원을 검색해 새 관리자로 지정합니다."
    >
      <section>
        <h2 className="mb-4 text-xl font-black text-forest">현재 관리자</h2>
        <div className="grid gap-4">
          {admins.map((admin) => {
            const grant = admin.roleHistory[0];
            const isSelf = admin.id === me.id;
            return (
              <Card key={admin.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/admins/${admin.id}`} className="font-semibold text-forest hover:underline">
                        {admin.name} →
                      </Link>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${adminRoleClassName[admin.adminRole as AdminRole]}`}
                      >
                        {adminRoleLabels[admin.adminRole as AdminRole]}
                      </span>
                      {isSelf && (
                        <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold text-ink/60">
                          본인 계정
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-ink/60">{admin.email}</p>
                    <p className="mt-1 text-xs text-ink/45">
                      {grant
                        ? `${dateTimeFormatter.format(grant.createdAt)} · ${grant.actorEmail}이(가) 지정`
                        : "최초 설정(CLI 부트스트랩) — 변경 이력 없음"}
                    </p>
                  </div>
                </div>
                {!isSelf && (
                  <div className="mt-4 border-t border-forest/10 pt-4">
                    <AdminRoleChangeForm
                      userId={admin.id}
                      currentRole={admin.adminRole as AdminRole}
                      targetName={admin.name}
                    />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-black text-forest">새 관리자 지정</h2>
        <Card className="mb-6">
          <AdminSearchBar initialQuery={query} />
        </Card>

        {query && (
          <div className="grid gap-4">
            {candidates.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="font-semibold text-forest">
                  조건에 맞는 회원이 없습니다.
                </p>
                <p className="mt-2 text-sm text-ink/55">
                  이미 관리자인 회원은 검색 결과에 나타나지 않습니다.
                </p>
              </Card>
            ) : (
              candidates.map((candidate) => (
                <Card key={candidate.id}>
                  <p className="font-semibold text-forest">{candidate.name}</p>
                  <p className="mt-1 text-sm text-ink/60">
                    {maskEmail(candidate.email)}
                    {candidate.phone && ` · ${maskPhone(candidate.phone)}`}
                  </p>
                  <div className="mt-4 border-t border-forest/10 pt-4">
                    <AdminRoleChangeForm userId={candidate.id} currentRole={null} targetName={candidate.name} />
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </section>
    </AppShell>
  );
}
