import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { AdminExportSearchBar } from "@/components/app/AdminExportSearchBar";
import { AdminExportTargetCard } from "@/components/app/AdminExportTargetCard";
import { requireSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maskEmail, maskPhone } from "@/lib/mask";

export default async function AdminExportsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSuperAdmin();
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  let customers: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    projects: { id: string; name: string }[];
  }[] = [];

  if (query) {
    const where: Prisma.UserWhereInput = {
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { phone: { contains: query } },
      ],
    };
    customers = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        projects: { orderBy: { createdAt: "desc" }, select: { id: true, name: true } },
      },
    });
  }

  return (
    <AppShell
      title="데이터 내보내기"
      description="고객 한 명 또는 프로젝트 한 개 범위로 이용 내역을 Excel로 내려받습니다. 최고관리자만 실행할 수 있습니다."
    >
      <p className="mb-6 text-sm text-ink/55">
        전체 고객을 한 번에 내보내는 기능은 아직 제공하지 않습니다 — 데이터 규모가 커 별도의 비동기 처리 구조가 필요합니다.{" "}
        <Link href="/admin/exports/history" className="font-semibold text-forest hover:underline">
          내보내기 이력 보기 →
        </Link>
      </p>

      <Card className="mb-6">
        <AdminExportSearchBar initialQuery={query} />
      </Card>

      {query && (
        <div className="grid gap-4">
          {customers.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="font-semibold text-forest">조건에 맞는 회원이 없습니다.</p>
            </Card>
          ) : (
            customers.map((customer) => (
              <Card key={customer.id}>
                <p className="font-semibold text-forest">{customer.name}</p>
                <p className="mt-1 text-sm text-ink/60">
                  {maskEmail(customer.email)}
                  {customer.phone && ` · ${maskPhone(customer.phone)}`}
                </p>
                <ul className="mt-4 grid gap-3">
                  <AdminExportTargetCard
                    label="고객 전체 데이터"
                    description="이 고객이 보유한 모든 프로젝트와 이용 내역을 함께 내려받습니다."
                    scope={{ type: "CUSTOMER", customerId: customer.id, label: `${customer.name} 고객` }}
                  />
                  {customer.projects.map((project) => (
                    <AdminExportTargetCard
                      key={project.id}
                      label={project.name}
                      description="이 프로젝트 한 건의 이용 내역만 내려받습니다."
                      scope={{ type: "PROJECT", projectId: project.id, label: project.name }}
                    />
                  ))}
                </ul>
              </Card>
            ))
          )}
        </div>
      )}
    </AppShell>
  );
}
