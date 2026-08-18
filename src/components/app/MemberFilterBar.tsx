"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { memberStatusLabels, memberStatuses } from "@/data/memberStatus";
import { memberClassificationLabels, memberClassifications } from "@/data/memberType";

/**
 * 검색어는 입력할 때마다 요청하지 않고 제출(버튼/Enter) 시에만 URL을
 * 갱신한다. 상태·회원 구분 필터는 선택 즉시 반영한다.
 */
export function MemberFilterBar({
  initialQuery,
  initialStatus,
  initialType,
}: {
  initialQuery: string;
  initialStatus: string;
  initialType: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function pushParams(next: { q?: string; status?: string; type?: string }) {
    const params = new URLSearchParams();
    const q = next.q ?? initialQuery;
    const status = next.status ?? initialStatus;
    const type = next.type ?? initialType;
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    router.push(`/admin/users${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    pushParams({ q: query.trim() });
  }

  function handleStatusChange(event: React.ChangeEvent<HTMLSelectElement>) {
    pushParams({ status: event.target.value });
  }

  function handleTypeChange(event: React.ChangeEvent<HTMLSelectElement>) {
    pushParams({ type: event.target.value });
  }

  function handleReset() {
    setQuery("");
    router.push("/admin/users");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto_auto] min-w-0"
    >
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="이름, 이메일, 휴대폰 번호로 검색"
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest"
      />
      <select
        value={initialType}
        onChange={handleTypeChange}
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
      >
        <option value="">구분 전체</option>
        {memberClassifications.map((classification) => (
          <option key={classification} value={classification}>
            {memberClassificationLabels[classification]}
          </option>
        ))}
      </select>
      <select
        value={initialStatus}
        onChange={handleStatusChange}
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
      >
        <option value="">상태 전체</option>
        {memberStatuses.map((status) => (
          <option key={status} value={status}>
            {memberStatusLabels[status]}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="rounded-2xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest/90"
      >
        검색
      </button>
      <button
        type="button"
        onClick={handleReset}
        className="rounded-2xl border border-forest/15 px-5 py-3 text-sm font-semibold text-forest/70 hover:bg-cream"
      >
        초기화
      </button>
    </form>
  );
}
