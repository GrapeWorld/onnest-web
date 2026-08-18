"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { serviceRequestStatuses, serviceTypes } from "@/data/serviceRequests";

type Filters = {
  q?: string;
  status?: string;
  type?: string;
  partnerAssigned?: string;
  ownerAssigned?: string;
};

/**
 * 검색어는 입력할 때마다 요청하지 않고 제출(버튼/Enter) 시에만 URL을
 * 갱신한다. 드롭다운 필터는 선택 즉시 반영한다(InquiryFilterBar와 동일 패턴).
 */
export function ServiceLeadFilterBar({
  initialQuery,
  initialStatus,
  initialType,
  initialPartnerAssigned,
  initialOwnerAssigned,
}: {
  initialQuery: string;
  initialStatus: string;
  initialType: string;
  initialPartnerAssigned: string;
  initialOwnerAssigned: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function pushParams(next: Filters) {
    const params = new URLSearchParams();
    const q = next.q ?? initialQuery;
    const status = next.status ?? initialStatus;
    const type = next.type ?? initialType;
    const partnerAssigned = next.partnerAssigned ?? initialPartnerAssigned;
    const ownerAssigned = next.ownerAssigned ?? initialOwnerAssigned;
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (partnerAssigned) params.set("partnerAssigned", partnerAssigned);
    if (ownerAssigned) params.set("ownerAssigned", ownerAssigned);
    router.push(
      `/admin/service-leads${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    pushParams({ q: query.trim() });
  }

  function handleReset() {
    setQuery("");
    router.push("/admin/service-leads");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 min-w-0">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름, 연락처, 지역, 프로젝트명으로 검색"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest"
        />
        <button
          type="submit"
          className="rounded-2xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest/90"
        >
          검색
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <select
          value={initialStatus}
          onChange={(event) => pushParams({ status: event.target.value })}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
        >
          <option value="">상태 전체</option>
          {serviceRequestStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={initialType}
          onChange={(event) => pushParams({ type: event.target.value })}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
        >
          <option value="">서비스 유형 전체</option>
          {serviceTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={initialPartnerAssigned}
          onChange={(event) => pushParams({ partnerAssigned: event.target.value })}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
        >
          <option value="">파트너 배정 전체</option>
          <option value="assigned">배정됨</option>
          <option value="unassigned">미배정</option>
        </select>
        <select
          value={initialOwnerAssigned}
          onChange={(event) => pushParams({ ownerAssigned: event.target.value })}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
        >
          <option value="">담당자 배정 전체</option>
          <option value="assigned">배정됨</option>
          <option value="unassigned">미배정</option>
        </select>
      </div>
      <button
        type="button"
        onClick={handleReset}
        className="justify-self-start rounded-2xl border border-forest/15 px-5 py-2.5 text-sm font-semibold text-forest/70 hover:bg-cream"
      >
        초기화
      </button>
    </form>
  );
}
