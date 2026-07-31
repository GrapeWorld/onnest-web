"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function HandoverShareControl({
  projectId,
  shared,
  shareToken,
}: {
  projectId: string;
  shared: boolean;
  shareToken: string | null;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const shareUrl =
    shared && shareToken
      ? `${typeof window === "undefined" ? "" : window.location.origin}/handovers/share/${shareToken}`
      : null;

  async function toggle(next: boolean) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/handover/share`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shared: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "변경에 실패했습니다.");
        return;
      }
      setCopied(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  }

  async function copy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setError("복사에 실패했습니다. 주소를 직접 선택해 복사해주세요.");
    }
  }

  return (
    <div className="rounded-[24px] border border-forest/10 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-black text-forest">공유</h2>
          <p className="mt-1 text-sm text-ink/60">
            {shared
              ? "링크를 아는 사람은 로그인 없이 볼 수 있습니다."
              : "현재 비공개입니다. 나만 볼 수 있습니다."}
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => toggle(!shared)}
          className={`min-h-11 rounded-full px-5 py-2 text-sm font-bold transition disabled:opacity-60 ${
            shared
              ? "border border-forest/15 bg-white text-forest hover:border-forest/40"
              : "bg-forest text-white hover:bg-navy"
          }`}
        >
          {saving ? "처리 중..." : shared ? "공유 중지" : "공유 링크 만들기"}
        </button>
      </div>

      {shareUrl && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-2xl bg-cream px-4 py-3 text-xs text-ink/75">
            {shareUrl}
          </code>
          <button
            type="button"
            onClick={copy}
            className="min-h-11 rounded-full border border-forest/15 px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40"
          >
            {copied ? "복사됨" : "복사"}
          </button>
        </div>
      )}

      {shared && (
        <p className="mt-3 text-xs leading-6 text-ink/55">
          공유를 중지하면 기존 링크는 즉시 무효가 됩니다. 다시 켜면 새 주소가
          발급됩니다.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>
      )}
    </div>
  );
}
