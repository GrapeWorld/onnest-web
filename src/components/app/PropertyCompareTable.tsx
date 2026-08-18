"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import {
  candidatePropertyStatusClassName,
  propertyMatchResultClassName,
  type CandidatePropertyStatus,
} from "@/data/candidateProperty";
import { compareCandidateToPreference, type MatchablePreference } from "@/lib/propertyMatch";
import { formatWon } from "@/lib/currency";
import { formatDate } from "@/lib/dates";

export type ComparableProperty = {
  id: string;
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
  advantages: string | null;
  concerns: string | null;
};

export function PropertyCompareTable({
  items,
  preference,
}: {
  items: ComparableProperty[];
  preference: MatchablePreference;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selected = items.filter((item) => selectedIds.has(item.id));

  return (
    <div className="grid gap-6">
      <Card>
        <h2 className="text-base font-black text-forest">비교할 매물 선택 (2개 이상)</h2>
        <ul className="mt-4 grid gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <label className="flex min-w-0 items-center gap-3 rounded-2xl bg-cream/70 px-4 py-3 text-sm">
                <input
                  type="checkbox"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggle(item.id)}
                  className="h-4 w-4 shrink-0 rounded border-forest/30 text-forest focus:ring-forest"
                />
                <span className="min-w-0 break-words font-semibold text-forest">{item.title}</span>
                <span className="min-w-0 shrink-0 break-words text-xs text-ink/50">{item.address || "주소 미입력"}</span>
              </label>
            </li>
          ))}
        </ul>
      </Card>

      {selected.length < 2 ? (
        <Card className="p-8 text-center">
          <p className="text-sm text-ink/60">비교하려면 매물을 2개 이상 선택해주세요.</p>
        </Card>
      ) : (
        // 가로로 넓은 표 대신 매물별 세로 카드를 그리드로 배치한다 — 화면이
        // 좁아지면 다음 줄로 자연스럽게 넘어갈 뿐, 페이지 자체가 가로로
        // 넘치지 않는다.
        <div className="grid min-w-0 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {selected.map((item) => {
            const matches = compareCandidateToPreference(item, preference);
            return (
              <Card key={item.id} className="min-w-0 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      candidatePropertyStatusClassName[item.status as CandidatePropertyStatus] ?? "bg-cream text-forest"
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="min-w-0 break-words text-base font-black text-forest">{item.title}</span>
                </div>

                <dl className="mt-4 grid gap-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink/50">거래 유형</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-forest">{item.transactionType ?? "미입력"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink/50">매매가</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-forest">
                      {item.price != null ? `${formatWon(item.price)}원` : "미입력"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink/50">보증금/월세</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-forest">
                      {item.deposit != null ? `${formatWon(item.deposit)}원` : "-"} /{" "}
                      {item.monthlyRent != null ? `${formatWon(item.monthlyRent)}원` : "-"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink/50">면적</dt>
                    <dd className="font-semibold text-forest">{item.area != null ? `${item.area}㎡` : "미입력"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink/50">방 개수</dt>
                    <dd className="font-semibold text-forest">{item.roomCount != null ? `${item.roomCount}개` : "미입력"}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-ink/50">입주 가능일</dt>
                    <dd className="min-w-0 break-words text-right font-semibold text-forest">
                      {item.availableDate ? formatDate(item.availableDate) : "미입력"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-4 grid gap-1.5">
                  <p className="text-xs font-bold text-ink/45">희망 조건 일치</p>
                  {matches.map((match) => (
                    <div key={match.label} className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className={`shrink-0 rounded-full px-2 py-0.5 font-bold ${propertyMatchResultClassName[match.result]}`}>
                        {match.result}
                      </span>
                      <span className="text-ink/60">{match.label}</span>
                    </div>
                  ))}
                </div>

                {item.advantages && (
                  <div className="mt-4">
                    <p className="text-xs font-bold text-ink/45">장점</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink/65">{item.advantages}</p>
                  </div>
                )}
                {item.concerns && (
                  <div className="mt-3">
                    <p className="text-xs font-bold text-ink/45">걱정되는 점</p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-ink/65">{item.concerns}</p>
                  </div>
                )}

                <Link
                  href={`/my/candidate-properties/${item.id}`}
                  className="mt-4 inline-block text-xs font-semibold text-forest hover:underline"
                >
                  상세보기 →
                </Link>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
