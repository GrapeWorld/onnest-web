"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminRoles, adminRoleLabels, type AdminRole } from "@/data/adminRole";

const REVOKE_VALUE = "__revoke__";

/**
 * 관리자 권한 부여·변경·회수 폼. window.confirm 대신 포커스 가능한 확인
 * 패널을 쓴다 — 스크린리더 사용자도 변경 내용을 읽고 명시적으로 확정할 수
 * 있어야 한다(candidatePropertyDeleteControl·PropertySuggestionForm과 같은
 * confirm-state 원칙).
 */
export function AdminRoleChangeForm({
  userId,
  currentRole,
  targetName,
}: {
  userId: string;
  currentRole: AdminRole | null;
  targetName: string;
}) {
  const router = useRouter();
  const options = [
    ...adminRoles.filter((role) => role !== currentRole),
    ...(currentRole ? [REVOKE_VALUE] : []),
  ];
  const [toRole, setToRole] = useState(options[0] ?? "");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (options.length === 0) return null;

  const targetLabel = toRole === REVOKE_VALUE ? "관리자 권한 회수" : adminRoleLabels[toRole as AdminRole];

  function handleReviewClick(event: React.FormEvent) {
    event.preventDefault();
    if (!reason.trim()) {
      setError("변경 사유를 입력해주세요.");
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function handleConfirm() {
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
        setConfirming(false);
        return;
      }

      setReason("");
      setConfirming(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleReviewClick} className="grid gap-2 min-w-0">
      <div className="grid gap-2 sm:grid-cols-[160px_1fr_auto] sm:items-start">
        <select
          value={toRole}
          onChange={(event) => {
            setToRole(event.target.value);
            setConfirming(false);
          }}
          disabled={saving}
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-3 py-2 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
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
            onChange={(event) => {
              setReason(event.target.value);
              setConfirming(false);
            }}
            disabled={saving}
            placeholder="변경 사유 (필수)"
            className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-3 py-2 text-base outline-none focus:border-forest disabled:opacity-60"
          />
          {error && (
            <p role="alert" className="text-xs font-semibold text-red-600">
              {error}
            </p>
          )}
        </div>
        <button
          type="submit"
          disabled={saving || !reason.trim()}
          className="rounded-full bg-forest px-4 py-2 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
        >
          변경 내용 확인
        </button>
      </div>

      {confirming && (
        <div
          role="alertdialog"
          aria-label="관리자 권한 변경 확인"
          className="grid min-w-0 gap-3 rounded-2xl bg-cream p-4"
        >
          <p className="text-sm font-semibold text-forest">
            {targetName}님을 {targetLabel}(으)로 변경할까요?
          </p>
          <p className="text-xs text-ink/60">사유: {reason}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={saving}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "변경하는 중..." : "변경 확정"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
