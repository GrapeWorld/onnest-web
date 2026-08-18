"use client";

import { useState } from "react";

export function InquiryLinkRequestButton({ inquiryId }: { inquiryId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setState("sending");
    setError(null);
    try {
      const res = await fetch("/api/my/inquiries/link-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "요청에 실패했습니다.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setState("idle");
    }
  }

  if (state === "sent") {
    return <p className="text-xs font-semibold text-forest">확인 메일을 보냈습니다. 메일함을 확인해주세요.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={state === "sending"}
        className="inline-flex items-center justify-center min-h-11 rounded-full border border-forest/15 bg-white px-4 py-1.5 text-xs font-semibold text-forest hover:bg-cream disabled:opacity-60"
      >
        {state === "sending" ? "요청 중..." : "연결하기"}
      </button>
      {error && <p className="mt-1 text-xs font-semibold text-red-600">{error}</p>}
    </div>
  );
}
