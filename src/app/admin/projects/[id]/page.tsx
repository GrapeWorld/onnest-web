import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import { PropertySuggestionForm } from "@/components/app/PropertySuggestionForm";
import { PropertySuggestionAdminList } from "@/components/app/PropertySuggestionAdminList";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function AdminProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const project = await prisma.project.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      addressPending: true,
      moveInDate: true,
      spaceType: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          propertyPreference: true,
          _count: { select: { candidateProperties: true } },
        },
      },
      propertySuggestions: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!project) notFound();

  const preference = project.user.propertyPreference;
  const suggestions = project.propertySuggestions;
  const interestedCount = suggestions.filter((s) => s.customerStatus === "INTERESTED" || s.customerStatus === "SAVED").length;
  const activeSuggestions = suggestions.filter((s) => !s.withdrawnAt);

  return (
    <AppShell title={project.name} description={`${project.user.name} 고객의 프로젝트 · 프로젝트 맞춤 매물 공유`}>
      <Link href={`/admin/users/${project.user.id}`} className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 고객 상세로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card>
          <h2 className="text-lg font-black text-forest">프로젝트 정보</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <div>
              <dt className="text-ink/50">고객</dt>
              <dd className="font-semibold text-forest">{project.user.name} ({project.user.email})</dd>
            </div>
            <div>
              <dt className="text-ink/50">목표 주소 · 희망 지역</dt>
              <dd className="font-semibold text-forest">
                {project.address || (project.addressPending ? "주소 미정" : "미입력")}
              </dd>
            </div>
            <div>
              <dt className="text-ink/50">입주 예정일</dt>
              <dd className="font-semibold text-forest">{project.moveInDate ? formatDate(project.moveInDate) : "미정"}</dd>
            </div>
            <div>
              <dt className="text-ink/50">공간 유형</dt>
              <dd className="font-semibold text-forest">{project.spaceType}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <h2 className="text-lg font-black text-forest">희망 조건 · 현황</h2>
          {preference ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <div>
                <dt className="text-ink/50">희망 지역</dt>
                <dd className="font-semibold text-forest">{preference.desiredRegion || "미입력"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">거래 유형 · 예산</dt>
                <dd className="font-semibold text-forest">
                  {preference.transactionType ?? "미입력"} ·{" "}
                  {preference.minBudget || preference.maxBudget
                    ? `${preference.minBudget?.toLocaleString() ?? "-"} ~ ${preference.maxBudget?.toLocaleString() ?? "-"}원`
                    : "미입력"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">최소 면적 · 최소 방 개수</dt>
                <dd className="font-semibold text-forest">
                  {preference.minArea ? `${preference.minArea}㎡` : "미입력"} · {preference.minRooms ?? "미입력"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">희망 입주일</dt>
                <dd className="font-semibold text-forest">
                  {preference.desiredMoveInDate ? formatDate(preference.desiredMoveInDate) : "미입력"}
                </dd>
              </div>
              {(preference.mustHave || preference.niceToHave) && (
                <div>
                  <dt className="text-ink/50">필수·선호 조건</dt>
                  <dd className="text-ink/70">
                    {preference.mustHave && <p>필수: {preference.mustHave}</p>}
                    {preference.niceToHave && <p>선호: {preference.niceToHave}</p>}
                  </dd>
                </div>
              )}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-ink/55">고객이 아직 희망 조건을 저장하지 않았습니다.</p>
          )}

          <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-forest/10 pt-4 text-center text-sm">
            <div>
              <dt className="text-xs text-ink/50">관심 매물</dt>
              <dd className="text-lg font-black text-forest">{project.user._count.candidateProperties}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink/50">공유한 매물</dt>
              <dd className="text-lg font-black text-forest">{activeSuggestions.length}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink/50">관심 응답</dt>
              <dd className="text-lg font-black text-forest">{interestedCount}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-black text-forest">매물 공유하기</h2>
        <p className="mt-1 text-sm text-ink/55">
          외부 사이트에서 확인한 매물을 직접 입력해 이 고객에게 공유합니다. ONNEST는 매물을 중개하지 않으며, 정보의 정확성을 보증하지 않습니다.
        </p>
        <div className="mt-4">
          {canEdit ? (
            <PropertySuggestionForm projectId={project.id} />
          ) : (
            <ViewerReadOnlyNotice>조회전용 관리자는 매물을 공유할 수 없습니다.</ViewerReadOnlyNotice>
          )}
        </div>
      </Card>

      <Card className="mt-6">
        <h2 className="text-lg font-black text-forest">공유 내역</h2>
        <div className="mt-4">
          <PropertySuggestionAdminList
            canEdit={canEdit}
            items={suggestions.map((s) => ({
              id: s.id,
              sourceUrl: s.sourceUrl,
              title: s.title,
              address: s.address,
              transactionType: s.transactionType,
              price: s.price,
              deposit: s.deposit,
              monthlyRent: s.monthlyRent,
              area: s.area,
              roomCount: s.roomCount,
              availableDate: s.availableDate ? s.availableDate.toISOString() : null,
              sharedReason: s.sharedReason,
              cautionNote: s.cautionNote,
              adminMemo: s.adminMemo,
              customerStatus: s.customerStatus,
              customerMemo: s.customerMemo,
              sharedByName: s.sharedByName,
              withdrawnAt: s.withdrawnAt ? s.withdrawnAt.toISOString() : null,
              createdAt: s.createdAt.toISOString(),
            }))}
          />
        </div>
      </Card>
    </AppShell>
  );
}
