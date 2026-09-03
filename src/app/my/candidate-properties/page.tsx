import Link from "next/link";
import { redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { Button } from "@/components/ui/Button";
import { PropertyPreferenceForm } from "@/components/app/PropertyPreferenceForm";
import { PropertyExplorer } from "@/components/app/property-explorer/PropertyExplorer";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isNaverMapConfigured } from "@/lib/naverMap";
import { listAllCustomerPropertySuggestions } from "@/lib/propertySuggestions";
import {
  buildSavedExplorerItem,
  buildSuggestedExplorerItem,
  dedupeSuggestionsAgainstSaved,
} from "@/lib/propertyExplorer";

export default async function CandidatePropertiesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [properties, preference, { items: allSuggestions }] = await Promise.all([
    prisma.candidateProperty.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        // 관리자 공유를 저장해 만들어진 후보라면 어느 프로젝트에서 왔는지
        // 배지에 표시한다. adminMemo·공유자 정보는 여기서도 select하지
        // 않는다(customerPropertySuggestionSelect와 같은 원칙).
        suggestionOrigin: { select: { project: { select: { name: true } } } },
      },
    }),
    prisma.propertyPreference.findUnique({ where: { userId: user.id } }),
    listAllCustomerPropertySuggestions(user.id),
  ]);

  // 관리자 공유를 이미 저장한 매물은 CandidateProperty 카드로 위에서
  // 한 번 표시되므로, 그 원본 공유 카드는 목록에서 뺀다(중복 표시 방지).
  const unsavedSuggestions = dedupeSuggestionsAgainstSaved(allSuggestions, properties);

  const savedItems = properties.map((property) =>
    buildSavedExplorerItem({
      ...property,
      availableDateISO: property.availableDate ? property.availableDate.toISOString() : null,
      createdAt: property.createdAt.toISOString(),
      suggestionOrigin: property.suggestionOrigin ? { projectName: property.suggestionOrigin.project.name } : null,
    }),
  );
  const suggestedItems = unsavedSuggestions.map((suggestion) =>
    buildSuggestedExplorerItem({
      ...suggestion,
      projectName: suggestion.project.name,
      availableDateISO: suggestion.availableDate ? suggestion.availableDate.toISOString() : null,
      createdAt: suggestion.createdAt.toISOString(),
    }),
  );
  const explorerItems = [...savedItems, ...suggestedItems];
  const adminSharedSavedCount = savedItems.filter((item) => item.origin === "ADMIN_SHARED").length;

  return (
    <CustomerAppShell
      title="매물 후보"
      description="관심 있는 매물을 저장하고 조건을 비교해 보세요."
    >
      <div className="flex flex-col">
        {/* 모바일에서는 매물 목록·지도가 희망 조건 입력 폼·추가 CTA보다
            먼저 보이도록 순서를 뒤집는다 — 이 화면에 들어오는 주된 목적은
            저장한 매물을 확인하는 것이라, 아직 입력 안 했을 수도 있는
            희망 조건 폼이나 "매물 후보 추가" 버튼이 먼저 나오면 지도가
            첫 화면 밖으로 밀려난다. lg 이상 데스크톱은 좌우 분할 레이아웃이라
            이 순서가 무의미해 원래 문서 순서(order-none)로 둔다. */}
        <div className="order-3 mt-6 lg:order-none lg:mb-6 lg:mt-0">
          <div className="flex flex-col gap-3 sm:flex-row">
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
          <p className="-mt-3 text-xs text-ink/50">
            외부 사이트에서 매물을 확인한 뒤 링크를 저장해 주세요. ONNEST는 네이버와 제휴하거나 매물 정보를 제공받지 않으며, 직접 입력한 정보만 저장합니다.
          </p>
        </div>

        <div className="order-2 mb-6 lg:order-none">
          <PropertyPreferenceForm preference={preference} />
        </div>

        <div className="order-1 lg:order-none">
          <PropertyExplorer
            header={
              <div className="mb-4 flex min-w-0 flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black text-forest">매물 후보</h2>
                  <span className="rounded-full bg-cream px-3 py-1 text-xs font-bold text-forest">
                    저장한 매물 {properties.length}건
                  </span>
                  {adminSharedSavedCount > 0 && (
                    <span className="rounded-full bg-sage/20 px-3 py-1 text-xs font-bold text-forest">
                      관리자 공유에서 저장한 매물 {adminSharedSavedCount}건
                    </span>
                  )}
                  {unsavedSuggestions.length > 0 && (
                    <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-forest">
                      저장하지 않은 공유 매물 {unsavedSuggestions.length}건
                    </span>
                  )}
                </div>
                {/* 매물이 이미 있으면 하단 CTA 블록(설명+추가+네이버페이 안내)이
                    목록 뒤로 밀려 눈에 잘 안 띈다 — 제목 옆에 작은 보조 진입점을
                    따로 둔다. 굳이 primary 버튼으로 강조하지 않는다: 이 화면의
                    주된 목적은 "확인·비교"이지 "추가"가 아니다. 하단 블록은
                    손대지 않고 그대로 둔다(설명 목적, 이 링크는 빠른 진입 목적
                    — 서로 역할이 다르다). */}
                <div className="flex min-w-0 flex-wrap items-center gap-3">
                  {explorerItems.length > 0 && (
                    <Link
                      href="/my/candidate-properties/new"
                      className="inline-flex min-h-11 min-w-0 items-center justify-center gap-1 rounded-full border border-forest/15 bg-white px-4 text-sm font-semibold text-forest hover:border-forest/40"
                    >
                      + 매물 후보 추가
                    </Link>
                  )}
                  {properties.length >= 2 && (
                    <Link
                      href="/my/candidate-properties/compare"
                      className="text-sm font-semibold text-forest hover:underline"
                    >
                      여러 매물 비교하기 →
                    </Link>
                  )}
                </div>
              </div>
            }
            items={explorerItems}
            preference={
              preference
                ? {
                    desiredRegion: preference.desiredRegion,
                    transactionType: preference.transactionType,
                    minBudget: preference.minBudget,
                    maxBudget: preference.maxBudget,
                    minArea: preference.minArea,
                    minRooms: preference.minRooms,
                    desiredMoveInDateISO: preference.desiredMoveInDate
                      ? preference.desiredMoveInDate.toISOString()
                      : null,
                  }
                : null
            }
            mapConfigured={isNaverMapConfigured()}
          />
        </div>
      </div>
    </CustomerAppShell>
  );
}
