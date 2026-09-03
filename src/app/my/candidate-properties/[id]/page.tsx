import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { Card } from "@/components/ui/Card";
import { CandidatePropertyDeleteControl } from "@/components/app/CandidatePropertyDeleteControl";
import { PropertyVisitChecklist } from "@/components/app/PropertyVisitChecklist";
import { ConvertToProjectButton } from "@/components/app/ConvertToProjectButton";
import { StaticPropertyMap } from "@/components/app/StaticPropertyMap";
import {
  candidatePropertyStatusClassName,
  propertyMatchResultClassName,
  type CandidatePropertyStatus,
} from "@/data/candidateProperty";
import { getPropertySourceLabel } from "@/lib/propertyUrl";
import { compareCandidateToPreference } from "@/lib/propertyMatch";
import { describeSuggestionOrigin } from "@/lib/propertySuggestionOrigin";
import { getCurrentUser } from "@/lib/auth";
import { isNaverMapConfigured } from "@/lib/naverMap";
import { prisma } from "@/lib/prisma";
import { formatWon } from "@/lib/currency";
import { formatDate } from "@/lib/dates";

export default async function CandidatePropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const [property, preference] = await Promise.all([
    prisma.candidateProperty.findFirst({
      where: { id, userId: user.id },
      include: {
        checklist: { where: { checked: true }, select: { label: true } },
        linkedProject: { select: { id: true, name: true } },
        // 관리자가 공유한 매물을 저장해 만들어진 후보라면 그 원본의
        // 고객 대상 필드만 가져온다 — adminMemo·공유자 정보는 관리자
        // 전용이라 여기서도 select에 아예 넣지 않는다(customerPropertySuggestionSelect와
        // 같은 원칙).
        suggestionOrigin: { select: { sharedReason: true, cautionNote: true } },
      },
    }),
    prisma.propertyPreference.findUnique({ where: { userId: user.id } }),
  ]);
  if (!property) notFound();

  const matches = compareCandidateToPreference(property, preference);
  const mapConfigured = isNaverMapConfigured();
  const hasCoordinates = property.latitude != null && property.longitude != null;
  const suggestionOriginDisplay = property.suggestionOrigin
    ? describeSuggestionOrigin(property.suggestionOrigin, property.advantages, property.concerns)
    : null;

  return (
    <CustomerAppShell title={property.title} description="저장한 매물 정보와 희망 조건 비교 결과를 확인합니다.">
      <Link href="/my/candidate-properties" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 매물 후보 목록으로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-forest">매물 정보</h2>
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  candidatePropertyStatusClassName[property.status as CandidatePropertyStatus] ?? "bg-cream text-forest"
                }`}
              >
                {property.status}
              </span>
            </div>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div className="min-w-0 break-words">
                <dt className="text-ink/50">주소</dt>
                <dd className="font-semibold text-forest">{property.address || "미입력"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">거래 유형</dt>
                <dd className="font-semibold text-forest">{property.transactionType ?? "미입력"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">매매가</dt>
                <dd className="font-semibold text-forest">{property.price != null ? `${formatWon(property.price)}원` : "미입력"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">보증금 / 월세</dt>
                <dd className="font-semibold text-forest">
                  {property.deposit != null ? `${formatWon(property.deposit)}원` : "미입력"} /{" "}
                  {property.monthlyRent != null ? `${formatWon(property.monthlyRent)}원` : "미입력"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">전용면적</dt>
                <dd className="font-semibold text-forest">{property.area != null ? `${property.area}㎡` : "미입력"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">방 개수</dt>
                <dd className="font-semibold text-forest">{property.roomCount != null ? `${property.roomCount}개` : "미입력"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">입주 가능일</dt>
                <dd className="font-semibold text-forest">
                  {property.availableDate ? formatDate(property.availableDate) : "미입력"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">출처</dt>
                <dd className="font-semibold text-forest">{getPropertySourceLabel(property.sourceUrl)}</dd>
              </div>
            </dl>

            <a
              href={property.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-forest hover:underline"
            >
              원본 매물 보기
              <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
            </a>

            <div className="mt-5">
              <p className="text-xs font-bold text-ink/45">위치</p>
              <div className="mt-2 overflow-hidden rounded-2xl border border-forest/10">
                <StaticPropertyMap
                  candidateId={property.id}
                  address={property.address}
                  title={property.title}
                  mapConfigured={mapConfigured}
                  hasCoordinates={hasCoordinates}
                  imgClassName="w-full max-w-full"
                  className="h-40"
                />
              </div>
              {hasCoordinates && mapConfigured && (
                <p className="mt-1 text-xs text-ink/40">지도 제공: 네이버 클라우드 플랫폼</p>
              )}
            </div>

            {(property.memo || property.advantages || property.concerns) && (
              <div className="mt-5 grid gap-3">
                {property.memo && (
                  <div>
                    <p className="text-xs font-bold text-ink/45">메모</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink/70">{property.memo}</p>
                  </div>
                )}
                {property.advantages && (
                  <div>
                    <p className="text-xs font-bold text-ink/45">장점</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink/70">{property.advantages}</p>
                  </div>
                )}
                {property.concerns && (
                  <div>
                    <p className="text-xs font-bold text-ink/45">걱정되는 점</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-ink/70">{property.concerns}</p>
                  </div>
                )}
              </div>
            )}
          </Card>

          {property.suggestionOrigin && suggestionOriginDisplay && (
            <Card>
              <h2 className="text-lg font-black text-forest">관리자 공유 정보</h2>
              <p className="mt-1 text-xs text-ink/50">
                이 매물은 관리자가 프로젝트에 공유한 매물을 저장한 것입니다. ONNEST는 매물을 직접 검증하지 않습니다.
              </p>
              <div className="mt-4 grid gap-3">
                {suggestionOriginDisplay.showReason && (
                  <div className="min-w-0 rounded-2xl bg-mint/40 px-4 py-3">
                    <p className="text-xs font-bold text-forest">관리자가 남긴 공유 이유(원문)</p>
                    <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm text-forest">
                      {property.suggestionOrigin.sharedReason}
                    </p>
                  </div>
                )}
                {suggestionOriginDisplay.showCaution && (
                  <div className="min-w-0 rounded-2xl bg-amber-50 px-4 py-3">
                    <p className="text-xs font-bold text-amber-800">관리자가 남긴 확인 필요 사항(원문)</p>
                    <p className="mt-1 min-w-0 whitespace-pre-wrap break-words text-sm text-amber-800">
                      {property.suggestionOrigin.cautionNote}
                    </p>
                  </div>
                )}
                {suggestionOriginDisplay.showReflectedNotice && (
                  <p className="text-sm text-ink/60">
                    공유 당시 남긴 이유·확인 필요 사항은 위 &quot;장점&quot;·&quot;걱정되는 점&quot;에 그대로 반영되어 있습니다.
                  </p>
                )}
                {suggestionOriginDisplay.showEmptyNotice && (
                  <p className="text-sm text-ink/60">관리자가 공유한 매물에서 저장했습니다. 별도로 전달된 설명은 없습니다.</p>
                )}
              </div>
            </Card>
          )}

          <Card>
            <h2 className="text-lg font-black text-forest">희망 조건 비교</h2>
            <p className="mt-1 text-xs text-ink/50">
              규칙 기반으로 비교한 결과입니다. &quot;추천&quot;·&quot;안전&quot;을 보장하지 않으며, 확인이 필요한 항목은 직접 확인해주세요.
            </p>
            <ul className="mt-4 grid gap-2">
              {matches.map((item) => (
                <li key={item.label} className="flex flex-wrap items-center gap-2 rounded-2xl bg-cream/70 px-4 py-3 text-sm">
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${propertyMatchResultClassName[item.result]}`}
                  >
                    {item.result}
                  </span>
                  <span className="min-w-0 break-words font-semibold text-forest">{item.label}</span>
                  <span className="min-w-0 break-words text-ink/60">{item.detail}</span>
                </li>
              ))}
            </ul>
            <Link href="/my/candidate-properties" className="mt-3 inline-block text-xs font-semibold text-forest hover:underline">
              희망 조건을 아직 저장하지 않았다면 목록 화면에서 설정할 수 있습니다.
            </Link>
          </Card>

          <Card>
            <h2 className="text-lg font-black text-forest">방문 확인 체크리스트</h2>
            <div className="mt-4">
              <PropertyVisitChecklist
                candidateId={property.id}
                checkedLabels={property.checklist.map((item) => item.label)}
              />
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <h2 className="text-lg font-black text-forest">다음 단계</h2>
            {property.linkedProject ? (
              <div className="mt-3">
                <p className="text-sm text-ink/65">이 매물은 이미 프로젝트로 연결되어 있습니다.</p>
                <Link
                  href={`/projects/${property.linkedProject.id}`}
                  className="mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-navy"
                >
                  &quot;{property.linkedProject.name}&quot; 프로젝트 보기 →
                </Link>
              </div>
            ) : (
              <div className="mt-3 grid gap-3">
                <p className="text-sm text-ink/65">
                  이 매물을 최종 후보로 정했다면 ONNEST 입주 프로젝트로 만들어 준비를 이어갈 수 있습니다. 주소·입주일·예산을 미리 채워드리고, 마지막 단계에서 직접 확인·수정할 수 있습니다.
                </p>
                <ConvertToProjectButton
                  candidateId={property.id}
                  title={property.title}
                  address={property.address}
                  availableDate={property.availableDate}
                  price={property.price}
                  deposit={property.deposit}
                />
              </div>
            )}
          </Card>

          <Card>
            <h2 className="text-lg font-black text-forest">관리</h2>
            <div className="mt-3 flex flex-col items-start gap-3">
              <Link
                href={`/my/candidate-properties/${property.id}/edit`}
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
              >
                정보 수정
              </Link>
              <CandidatePropertyDeleteControl candidateId={property.id} />
            </div>
          </Card>
        </div>
      </div>
    </CustomerAppShell>
  );
}
