"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import {
  propertySuggestionCustomerStatusLabels,
  propertySuggestionCustomerStatusClassName,
  propertySuggestionCustomerResponseLabels,
  propertySuggestionCustomerResponses,
  type PropertySuggestionCustomerStatus,
  type PropertySuggestionCustomerResponse,
} from "@/data/propertySuggestion";
import { getPropertySourceLabel } from "@/lib/propertyUrl";
import { formatWon } from "@/lib/currency";
import { formatDate } from "@/lib/dates";

export type CustomerPropertySuggestionItem = {
  id: string;
  sourceUrl: string;
  title: string;
  address: string | null;
  transactionType: string | null;
  price: number | null;
  deposit: number | null;
  monthlyRent: number | null;
  area: number | null;
  roomCount: number | null;
  availableDate: string | null;
  sharedReason: string | null;
  cautionNote: string | null;
  customerStatus: string;
  savedCandidatePropertyId: string | null;
  createdAt: string;
};

/**
 * 관리자가 공유한 매물 1건. ONNEST가 매물을 직접 중개·검증하는 것처럼 보이지
 * 않도록 "공유된 매물"이라는 표현만 쓰고, 원본은 항상 외부 링크로만 확인하게
 * 한다(서버는 이 URL을 절대 요청하지 않는다).
 */
export function PropertySuggestionCustomerCard({ item }: { item: CustomerPropertySuggestionItem }) {
  const router = useRouter();
  const [status, setStatus] = useState(item.customerStatus);
  const [loading, setLoading] = useState<PropertySuggestionCustomerResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alreadySaved = Boolean(item.savedCandidatePropertyId);

  async function handleRespond(customerStatus: PropertySuggestionCustomerResponse) {
    if (loading) return;
    setLoading(customerStatus);
    setError(null);
    try {
      const res = await fetch(`/api/my/property-suggestions/${item.id}/response`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerStatus }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "응답 저장에 실패했습니다.");
        return;
      }
      setStatus(customerStatus);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(null);
    }
  }

  const badgeStatus = status as PropertySuggestionCustomerStatus;

  return (
    <li className="min-w-0 rounded-2xl border border-forest/10 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 break-words font-bold text-forest">{item.title}</p>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${propertySuggestionCustomerStatusClassName[badgeStatus] ?? "bg-cream text-forest"}`}
        >
          {propertySuggestionCustomerStatusLabels[badgeStatus] ?? status}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 break-words">
          <dt className="text-ink/50">주소</dt>
          <dd className="font-semibold text-forest">{item.address || "미입력"}</dd>
        </div>
        <div>
          <dt className="text-ink/50">거래 유형</dt>
          <dd className="font-semibold text-forest">{item.transactionType ?? "미입력"}</dd>
        </div>
        <div>
          <dt className="text-ink/50">매매가</dt>
          <dd className="font-semibold text-forest">{item.price != null ? `${formatWon(item.price)}원` : "미입력"}</dd>
        </div>
        <div>
          <dt className="text-ink/50">보증금 / 월세</dt>
          <dd className="font-semibold text-forest">
            {item.deposit != null ? `${formatWon(item.deposit)}원` : "미입력"} /{" "}
            {item.monthlyRent != null ? `${formatWon(item.monthlyRent)}원` : "미입력"}
          </dd>
        </div>
        <div>
          <dt className="text-ink/50">전용면적</dt>
          <dd className="font-semibold text-forest">{item.area != null ? `${item.area}㎡` : "미입력"}</dd>
        </div>
        <div>
          <dt className="text-ink/50">방 개수</dt>
          <dd className="font-semibold text-forest">{item.roomCount != null ? `${item.roomCount}개` : "미입력"}</dd>
        </div>
        <div>
          <dt className="text-ink/50">입주 가능일</dt>
          <dd className="font-semibold text-forest">{item.availableDate ? formatDate(new Date(item.availableDate)) : "미입력"}</dd>
        </div>
        <div>
          <dt className="text-ink/50">출처</dt>
          <dd className="font-semibold text-forest">{getPropertySourceLabel(item.sourceUrl)}</dd>
        </div>
      </dl>

      {item.sharedReason && (
        <p className="mt-3 rounded-xl bg-mint/40 px-3 py-2 text-sm text-forest">공유 이유: {item.sharedReason}</p>
      )}
      {item.cautionNote && (
        <p className="mt-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">확인 필요: {item.cautionNote}</p>
      )}

      <p className="mt-2 text-xs text-ink/45">{formatDate(new Date(item.createdAt))} 공유됨</p>

      <a
        href={item.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex min-w-0 items-center gap-1 text-sm font-semibold text-forest hover:underline"
      >
        외부 사이트에서 매물 확인
        <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
      </a>

      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}

      {alreadySaved ? (
        <Link
          href={`/my/candidate-properties/${item.savedCandidatePropertyId}`}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-navy"
        >
          저장한 매물 후보 보기 →
        </Link>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <Link
            href={`/my/candidate-properties/new?fromSuggestion=${item.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white hover:bg-navy"
          >
            내 매물 후보에 저장
          </Link>
          <div className="flex flex-wrap gap-2">
            {propertySuggestionCustomerResponses.map((response) => (
              <button
                key={response}
                type="button"
                onClick={() => handleRespond(response)}
                disabled={loading !== null}
                aria-pressed={status === response}
                className={`inline-flex min-h-11 items-center justify-center rounded-full border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  status === response
                    ? "border-forest bg-forest text-white"
                    : "border-forest/15 bg-white text-forest hover:border-forest/40"
                }`}
              >
                {loading === response ? "저장 중..." : propertySuggestionCustomerResponseLabels[response]}
              </button>
            ))}
          </div>
        </div>
      )}
    </li>
  );
}
