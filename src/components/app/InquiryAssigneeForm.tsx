"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inquiryStatuses } from "@/data/inquiries";

type AdminOption = { id: string; name: string; email: string };

export function InquiryAssigneeForm({
  inquiryId,
  status,
  assigneeId,
  nextAction,
  currentAdminId,
  admins,
}: {
  inquiryId: string;
  status: string;
  assigneeId: string | null;
  nextAction: string | null;
  currentAdminId: string;
  admins: AdminOption[];
}) {
  const router = useRouter();
  const [statusValue, setStatusValue] = useState(status);
  const [assigneeValue, setAssigneeValue] = useState(assigneeId ?? "");
  const [nextActionValue, setNextActionValue] = useState(nextAction ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(overrides: { assigneeId?: string }) {
    setSaving(true);
    setError(null);

    const nextAssigneeId = overrides.assigneeId ?? assigneeValue;

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusValue,
          assigneeId: nextAssigneeId || null,
          nextAction: nextActionValue,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      if (overrides.assigneeId !== undefined) setAssigneeValue(overrides.assigneeId);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    save({});
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3">
      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">상태</label>
        <select
          value={statusValue}
          onChange={(event) => setStatusValue(event.target.value)}
          disabled={saving}
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
        >
          {inquiryStatuses.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">담당자</label>
        <div className="flex gap-2">
          <select
            value={assigneeValue}
            onChange={(event) => setAssigneeValue(event.target.value)}
            disabled={saving}
            className="flex-1 rounded-2xl border border-forest/15 px-4 py-3 text-sm text-forest outline-none focus:border-forest disabled:opacity-60"
          >
            <option value="">미배정</option>
            {admins.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} ({option.email})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => save({ assigneeId: currentAdminId })}
            disabled={saving || assigneeValue === currentAdminId}
            className="whitespace-nowrap rounded-2xl border border-forest/15 px-4 py-3 text-xs font-semibold text-forest/70 hover:bg-cream disabled:opacity-60"
          >
            나에게 배정
          </button>
        </div>
      </div>

      <div className="grid gap-1">
        <label className="text-sm font-semibold text-forest">다음 액션</label>
        <input
          value={nextActionValue}
          onChange={(event) => setNextActionValue(event.target.value)}
          disabled={saving}
          placeholder="예: 내일 오전 전화 상담"
          className="rounded-2xl border border-forest/15 px-4 py-3 text-sm outline-none focus:border-forest disabled:opacity-60"
        />
      </div>

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {saving ? "저장 중..." : "저장"}
      </button>
    </form>
  );
}
