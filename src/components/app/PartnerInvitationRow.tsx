"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { partnerRoleLabels, type PartnerRole } from "@/data/partnerRole";

export function PartnerInvitationRow({
  invitationId,
  email,
  role,
  sentAt,
  expiresAt,
}: {
  invitationId: string;
  email: string;
  role: string;
  sentAt: string;
  expiresAt: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function cancel() {
    if (!window.confirm(`${email} 앞으로 보낸 초대를 취소할까요?`)) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/team/invitations/${invitationId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "취소에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setPending(false);
    }
  }

  async function resend() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/team/invitations/${invitationId}/resend`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "재발송에 실패했습니다.");
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
    <li className="rounded-2xl bg-cream px-4 py-3 text-sm">
      <p className="font-semibold text-forest">{email}</p>
      <p className="mt-1 text-xs text-ink/50">
        {partnerRoleLabels[role as PartnerRole] ?? role} · {sentAt} 발송 · {expiresAt}까지 유효
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={resend}
          disabled={pending}
          className="rounded-full border border-forest/15 bg-white px-3 py-1.5 text-xs font-semibold text-forest hover:bg-cream disabled:opacity-60"
        >
          재발송
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={pending}
          className="rounded-full border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
        >
          취소
        </button>
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-semibold text-red-600">{error}</p>}
    </li>
  );
}
