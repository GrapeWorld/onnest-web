"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  partnerRoles,
  partnerRoleLabels,
  partnerMembershipStatusLabels,
  type PartnerRole,
  type PartnerMembershipStatus,
} from "@/data/partnerRole";

const statusBadgeClass: Record<PartnerMembershipStatus, string> = {
  ACTIVE: "bg-mint text-forest",
  SUSPENDED: "bg-cream text-forest",
  REVOKED: "bg-ink/10 text-ink/60",
};

export function PartnerMemberRow({
  membershipId,
  name,
  email,
  role,
  status,
  lastLoginAt,
  isSelf,
}: {
  membershipId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  lastLoginAt: string | null;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function patch(body: { role: PartnerRole } | { status: PartnerMembershipStatus }) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/team/members/${membershipId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "변경에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="rounded-2xl bg-cream px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="break-words font-semibold text-forest">
            {name} {isSelf && <span className="text-xs text-ink/45">(나)</span>}
          </p>
          <p className="mt-0.5 break-words text-xs text-ink/50">{email}</p>
          <p className="mt-0.5 text-xs text-ink/45">
            최근 로그인: {lastLoginAt ? new Date(lastLoginAt).toLocaleString("ko-KR") : "기록 없음"}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass[status as PartnerMembershipStatus] ?? "bg-cream text-forest"}`}
        >
          {partnerMembershipStatusLabels[status as PartnerMembershipStatus] ?? status}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={role}
          onChange={(event) => patch({ role: event.target.value as PartnerRole })}
          disabled={pending}
          className="box-border w-full min-w-0 max-w-full rounded-full border border-forest/15 bg-white px-3 py-1.5 text-base font-semibold text-forest outline-none focus:border-forest disabled:opacity-60"
        >
          {partnerRoles.map((option) => (
            <option key={option} value={option}>
              {partnerRoleLabels[option]}
            </option>
          ))}
        </select>

        {status === "ACTIVE" && (
          <button
            type="button"
            onClick={() => patch({ status: "SUSPENDED" })}
            disabled={pending}
            className="inline-flex items-center justify-center min-h-11 rounded-full border border-forest/15 bg-white px-3 py-1.5 text-xs font-semibold text-forest hover:bg-cream disabled:opacity-60"
          >
            정지
          </button>
        )}
        {status === "SUSPENDED" && (
          <button
            type="button"
            onClick={() => patch({ status: "ACTIVE" })}
            disabled={pending}
            className="inline-flex items-center justify-center min-h-11 rounded-full border border-forest/15 bg-white px-3 py-1.5 text-xs font-semibold text-forest hover:bg-cream disabled:opacity-60"
          >
            재활성화
          </button>
        )}
        {!isSelf && status !== "REVOKED" && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`${name}님을 팀에서 해제할까요?`)) patch({ status: "REVOKED" });
            }}
            disabled={pending}
            className="inline-flex items-center justify-center min-h-11 rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            해제
          </button>
        )}
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
