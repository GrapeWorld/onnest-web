"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminRoles, adminRoleLabels, type AdminRole } from "@/data/adminRole";

const REVOKE_VALUE = "__revoke__";

export function AdminRoleChangeForm({
  userId,
  currentRole,
}: {
  userId: string;
  currentRole: AdminRole | null;
}) {
  const router = useRouter();
  const options = [
    ...adminRoles.filter((role) => role !== currentRole),
    ...(currentRole ? [REVOKE_VALUE] : []),
  ];
  const [toRole, setToRole] = useState(options[0] ?? "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const label = toRole === REVOKE_VALUE ? "관리자 권한 회수" : adminRoleLabels[toRole as AdminRole];
    if (!window.confirm(`${label}(으)로 변경할까요?`)) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/admins/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toRole: toRole === REVOKE_VALUE ? null : toRole,
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "권한 변경에 실패했습니다.");
        return;
      }

      setReason("");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start">
      <select
        value={toRole}
        onChange={(event) => setToRole(event.target.value)}
        disabled={saving}
        className="rounded-2xl border border-forest/15 px-3 py-2 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === REVOKE_VALUE ? "권한 회수" : adminRoleLabels[option as AdminRole]}
          </option>
        ))}
      </select>
      <div className="grid gap-1">
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          disabled={saving}
          placeholder="변경 사유 (필수)"
          className="rounded-2xl border border-forest/15 px-3 py-2 text-sm outline-none focus:border-forest disabled:opacity-60"
        />
        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      </div>
      <button
        type="submit"
        disabled={saving || !reason.trim()}
        className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "처리 중..." : "적용"}
      </button>
    </form>
  );
}
