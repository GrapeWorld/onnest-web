"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function AdminSearchBar({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/admin/admins?q=${encodeURIComponent(trimmed)}` : "/admin/admins");
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-[1fr_auto] min-w-0">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="관리자로 지정할 회원의 이름, 이메일, 휴대폰 번호로 검색"
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest"
      />
      <button
        type="submit"
        className="rounded-2xl bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest/90"
      >
        검색
      </button>
    </form>
  );
}
