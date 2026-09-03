import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/Card";
import {
  candidatePropertyStatusClassName,
  type CandidatePropertyStatus,
} from "@/data/candidateProperty";
import { getPropertySourceLabel } from "@/lib/propertyUrl";
import { compareCandidateToPreference, type MatchablePreference } from "@/lib/propertyMatch";
import { formatWon } from "@/lib/currency";

export type CandidatePropertyCardItem = {
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
  availableDate: Date | null;
  status: string;
};

export type PriceSummaryInput = {
  transactionType: string | null;
  price: number | null;
  deposit: number | null;
  monthlyRent: number | null;
};

export function priceSummary(item: PriceSummaryInput) {
  if (item.transactionType === "매매" && item.price != null) return `${formatWon(item.price)}원`;
  if (item.deposit != null && item.monthlyRent != null) {
    return `${formatWon(item.deposit)} / ${formatWon(item.monthlyRent)}원`;
  }
  if (item.deposit != null) return `${formatWon(item.deposit)}원`;
  if (item.price != null) return `${formatWon(item.price)}원`;
  return "가격 미입력";
}

export function CandidatePropertyCard({
  item,
  preference,
}: {
  item: CandidatePropertyCardItem;
  preference: MatchablePreference;
}) {
  const matches = compareCandidateToPreference(item, preference);
  const matchCount = matches.filter((m) => m.result === "일치").length;
  const mismatchCount = matches.filter((m) => m.result === "불일치").length;

  return (
    <Card className="min-w-0 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
              candidatePropertyStatusClassName[item.status as CandidatePropertyStatus] ?? "bg-cream text-forest"
            }`}
          >
            {item.status}
          </span>
          <span className="min-w-0 break-words text-base font-black text-forest">{item.title}</span>
        </div>
      </div>

      <p className="mt-2 min-w-0 break-words text-sm text-ink/60">{item.address || "주소 미입력"}</p>

      <div className="mt-4 grid gap-2 text-sm text-ink/65 sm:grid-cols-2">
        <p>
          <span className="font-bold text-forest">거래 유형</span> {item.transactionType ?? "미입력"}
        </p>
        <p className="min-w-0 break-words">
          <span className="font-bold text-forest">가격</span> {priceSummary(item)}
        </p>
        <p>
          <span className="font-bold text-forest">면적</span> {item.area != null ? `${item.area}㎡` : "미입력"}
        </p>
        <p>
          <span className="font-bold text-forest">출처</span> {getPropertySourceLabel(item.sourceUrl)}
        </p>
      </div>

      <p className="mt-3 text-xs font-semibold text-ink/55">
        희망 조건 비교: 일치 {matchCount}건 · 불일치 {mismatchCount}건
      </p>

      <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold">
        <Link href={`/my/candidate-properties/${item.id}`} className="text-forest hover:underline">
          상세보기 →
        </Link>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-w-0 items-center gap-1 text-ink/60 hover:text-forest hover:underline"
        >
          원본 매물 보기
          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        </a>
      </div>
    </Card>
  );
}
