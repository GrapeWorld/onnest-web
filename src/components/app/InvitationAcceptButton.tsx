"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InvitationAcceptButton({ token }: { token: string }) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAccept() {
    setAccepting(true);
    setError(null);
    try {
      const res = await fetch(`/api/partner/invitations/${token}/accept`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "초대 수락에 실패했습니다.");
        return;
      }
      router.push("/partner");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <div className="grid gap-2">
      {error && <p role="alert" className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="button"
        onClick={handleAccept}
        disabled={accepting}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {accepting ? "수락 중..." : "초대 수락하기"}
      </button>
    </div>
  );
}
