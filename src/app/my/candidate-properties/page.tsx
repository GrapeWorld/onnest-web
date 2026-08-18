import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CandidatePropertyCard } from "@/components/app/CandidatePropertyCard";
import { PropertyPreferenceForm } from "@/components/app/PropertyPreferenceForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function CandidatePropertiesPage() {
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
    <AppShell
      title="매물 후보"
      description="관심 있는 매물을 저장하고 조건을 비교해 보세요."
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button href="/my/candidate-properties/new">매물 후보 추가</Button>
        <a
          href="https://fin.land.naver.com/home"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest transition hover:border-forest/40 hover:shadow-card"
        >
          네이버페이 부동산에서 매물 찾기 ↗
        </a>
      </div>
      <p className="-mt-3 mb-6 text-xs text-ink/50">
        외부 사이트에서 매물을 확인한 뒤 링크를 저장해 주세요. ONNEST는 네이버와 제휴하거나 매물 정보를 제공받지 않으며, 직접 입력한 정보만 저장합니다.
      </p>

      <div className="mb-6">
        <PropertyPreferenceForm preference={preference} />
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black text-forest">
          저장한 매물 <span className="text-base font-bold text-sage">{properties.length}건</span>
        </h2>
        {properties.length >= 2 && (
          <Link href="/my/candidate-properties/compare" className="text-sm font-semibold text-forest hover:underline">
            여러 매물 비교하기 →
          </Link>
        )}
      </div>

      {properties.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">아직 저장한 매물이 없습니다.</p>
          <p className="mt-2 text-sm text-ink/60">
            외부 사이트에서 확인한 매물을 저장하면 조건을 비교하고 방문 계획을 세울 수 있습니다.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <CandidatePropertyCard key={property.id} item={property} preference={preference} />
          ))}
        </div>
      )}
    </AppShell>
  );
}
