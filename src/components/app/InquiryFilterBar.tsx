"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inquiryStatuses, inquiryTypes } from "@/data/inquiries";

type AdminOption = { id: string; name: string; email: string };

type Filters = {
  q?: string;
  status?: string;
  type?: string;
  assignee?: string;
  from?: string;
  to?: string;
};

/**
 * 검색어·기간은 입력할 때마다 요청하지 않고 제출(버튼) 시에만 URL을
 * 갱신한다. 드롭다운 필터는 선택 즉시 반영한다.
 */
export function InquiryFilterBar({
  initialQuery,
  initialStatus,
  initialType,
  initialAssignee,
  initialFrom,
  initialTo,
  admins,
}: {
  initialQuery: string;
  initialStatus: string;
  initialType: string;
  initialAssignee: string;
  initialFrom: string;
  initialTo: string;
  admins: AdminOption[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);

  function pushParams(next: Filters) {
    const params = new URLSearchParams();
    const q = next.q ?? initialQuery;
    const status = next.status ?? initialStatus;
    const type = next.type ?? initialType;
    const assignee = next.assignee ?? initialAssignee;
    const nextFrom = next.from ?? from;
    const nextTo = next.to ?? to;
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (type) params.set("type", type);
    if (assignee) params.set("assignee", assignee);
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    router.push(
      `/admin/inquiries${params.toString() ? `?${params.toString()}` : ""}`,
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    pushParams({ q: query.trim(), from, to });
  }

  function handleReset() {
    setQuery("");
    setFrom("");
    setTo("");
    router.push("/admin/inquiries");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 min-w-0">
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="이름, 이메일, 휴대폰, 소속, 문의 내용으로 검색"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest"
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
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
        >
          <option value="">상태 전체</option>
          {inquiryStatuses.map((status) => (
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
          <option value="">문의 유형 전체</option>
          {inquiryTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <select
          value={initialAssignee}
          onChange={(event) => pushParams({ assignee: event.target.value })}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
        >
          <option value="">담당자 전체</option>
          <option value="unassigned">미배정</option>
          {admins.map((admin) => (
            <option key={admin.id} value={admin.id}>
              {admin.name} ({admin.email})
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-xs font-semibold text-ink/50 min-w-0">
          접수일(부터)
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
          />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-ink/50 min-w-0">
          접수일(까지)
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest"
          />
        </label>
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
