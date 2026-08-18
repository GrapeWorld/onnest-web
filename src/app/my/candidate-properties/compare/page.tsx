import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { PropertyCompareTable } from "@/components/app/PropertyCompareTable";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ComparePropertiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [properties, preference] = await Promise.all([
    prisma.candidateProperty.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.propertyPreference.findUnique({ where: { userId: user.id } }),
  ]);

  return (
    <AppShell title="매물 비교" description="저장한 매물 중 여러 개를 골라 조건을 나란히 비교합니다.">
      <Link href="/my/candidate-properties" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 매물 후보 목록으로
      </Link>

      {properties.length < 2 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">비교하려면 매물이 2개 이상 저장돼 있어야 합니다.</p>
        </Card>
      ) : (
        <PropertyCompareTable items={properties} preference={preference} />
      )}
    </AppShell>
  );
}
