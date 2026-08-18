import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { CandidatePropertyDeleteControl } from "@/components/app/CandidatePropertyDeleteControl";
import { PropertyVisitChecklist } from "@/components/app/PropertyVisitChecklist";
import { ConvertToProjectButton } from "@/components/app/ConvertToProjectButton";
import {
  candidatePropertyStatusClassName,
  propertyMatchResultClassName,
  type CandidatePropertyStatus,
} from "@/data/candidateProperty";
import { getPropertySourceLabel } from "@/lib/propertyUrl";
import { compareCandidateToPreference } from "@/lib/propertyMatch";
import { getCurrentUser } from "@/lib/auth";
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
      },
    }),
    prisma.propertyPreference.findUnique({ where: { userId: user.id } }),
  ]);
  if (!property) notFound();

  const matches = compareCandidateToPreference(property, preference);

  return (
    <AppShell title={property.title} description="저장한 매물 정보와 희망 조건 비교 결과를 확인합니다.">
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

            {property.latitude != null && property.longitude != null && (
              <div className="mt-5">
                <p className="text-xs font-bold text-ink/45">위치</p>
                {/* eslint-disable-next-line @next/next/no-img-element -- 우리 서버가 프록시하는 동적 이미지라 next/image 대상이 아니다. */}
                <img
                  src={`/api/my/candidate-properties/${property.id}/map`}
                  alt={`${property.address ?? property.title} 위치 지도`}
                  width={600}
                  height={300}
                  className="mt-2 w-full max-w-full rounded-2xl border border-forest/10"
                />
                <p className="mt-1 text-xs text-ink/40">지도 제공: 네이버 클라우드 플랫폼</p>
              </div>
            )}

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
    </AppShell>
  );
}
