"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { serviceRequestStatuses } from "@/data/serviceRequests";

type StaffOption = { id: string; name: string };

type Filters = { q?: string; status?: string; staff?: string };

/**
 * 검색어는 제출 시에만 URL을 갱신하고, 드롭다운은 선택 즉시 반영한다
 * (ServiceLeadFilterBar/InquiryFilterBar와 같은 패턴).
 */
export function PartnerRequestFilterBar({
  initialQuery,
  initialStatus,
  initialStaff,
  staffOptions,
}: {
  initialQuery: string;
  initialStatus: string;
  initialStaff: string;
  staffOptions: StaffOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function pushParams(next: Filters) {
    const params = new URLSearchParams();
    const q = next.q ?? initialQuery;
    const status = next.status ?? initialStatus;
    const staff = next.staff ?? initialStaff;
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (staff) params.set("staff", staff);
    router.push(`/partner${params.toString() ? `?${params.toString()}` : ""}`);
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    pushParams({ q: query.trim() });
  }

  function handleReset() {
    setQuery("");
    router.push("/partner");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름, 연락처, 지역, 프로젝트명으로 검색"
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest"
        />
        <button
          type="submit"
          className="rounded-2xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest/90"
        >
          검색
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <select
          value={initialStatus}
          onChange={(event) => pushParams({ status: event.target.value })}
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest"
        >
          <option value="">상태 전체</option>
          {serviceRequestStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        <select
          value={initialStaff}
          onChange={(event) => pushParams({ staff: event.target.value })}
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest"
        >
          <option value="">담당 직원 전체</option>
          <option value="unassigned">미배정</option>
          {staffOptions.map((staff) => (
            <option key={staff.id} value={staff.id}>
              {staff.name}
            </option>
          ))}
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
