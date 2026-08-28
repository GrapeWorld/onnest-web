"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Confirmation = { outcome: "OK" | "ISSUE" } | null;
type Review = { rating: number; comment: string | null } | null;

/**
 * "작업 완료" 신청 카드에 붙는 완료 확인·후기 위젯. 확인이 없으면 먼저
 * OK/ISSUE를 묻고, OK를 고른 뒤(또는 이미 OK로 확인된 뒤)에만 별점 후기를
 * 받는다 — ISSUE는 후기 대신 기존 문의 작성 화면으로 안내한다(별도 민원
 * 처리 체계를 만들지 않는다).
 */
export function ServiceCompletionControl({
  requestId,
  confirmation,
  review,
}: {
  requestId: string;
  confirmation: Confirmation;
  review: Review;
}) {
  const router = useRouter();
  const [localConfirmation, setLocalConfirmation] = useState(confirmation);
  const [localReview, setLocalReview] = useState(review);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");

  async function submitConfirmation(outcome: "OK" | "ISSUE") {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/my/service-requests/${requestId}/completion-confirmation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "처리에 실패했습니다.");
        return;
      }
      setLocalConfirmation({ outcome });
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  async function submitReview() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/my/service-requests/${requestId}/review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "후기 등록에 실패했습니다.");
        return;
      }
      setLocalReview({ rating, comment: comment.trim() || null });
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  if (localReview) {
    return (
      <div className="mt-4 rounded-2xl border border-sage/30 bg-sage/5 p-4">
        <p className="text-sm font-bold text-forest">남긴 후기 · {"★".repeat(localReview.rating)}{"☆".repeat(5 - localReview.rating)}</p>
        {localReview.comment && <p className="mt-1 text-sm text-ink/65">{localReview.comment}</p>}
      </div>
    );
  }

  if (localConfirmation?.outcome === "ISSUE") {
    return (
      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">확인해주셔서 감사합니다. 문의를 남겨주시면 확인 후 연락드리겠습니다.</p>
        <Link
          href="/contact"
          className="mt-2 inline-block text-sm font-bold text-forest underline"
        >
          문의 남기기 (서비스 신청 관련 문제)
        </Link>
      </div>
    );
  }

  if (localConfirmation?.outcome === "OK") {
    return (
      <div className="mt-4 grid min-w-0 gap-2 rounded-2xl border border-sage/30 bg-sage/5 p-4">
        <p className="text-sm font-bold text-forest">서비스는 어떠셨나요?</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              disabled={saving}
              aria-label={`${value}점`}
              className={`min-h-11 min-w-11 rounded-full text-xl ${value <= rating ? "text-amber-500" : "text-ink/20"}`}
            >
              ★
            </button>
          ))}
        </div>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          disabled={saving}
          rows={2}
          placeholder="후기를 남겨주세요 (선택)"
          className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 bg-white px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
        />
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <button
          type="button"
          onClick={submitReview}
          disabled={saving}
          className="min-h-11 w-fit rounded-full bg-forest px-4 text-sm font-semibold text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "등록 중..." : "후기 남기기"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 grid min-w-0 gap-2 rounded-2xl border border-sage/30 bg-sage/5 p-4">
      <p className="text-sm font-bold text-forest">서비스가 잘 완료되었나요?</p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submitConfirmation("OK")}
          disabled={saving}
          className="min-h-11 rounded-full bg-forest px-4 text-sm font-semibold text-white hover:bg-forest/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          예, 잘 완료됐어요
        </button>
        <button
          type="button"
          onClick={() => submitConfirmation("ISSUE")}
          disabled={saving}
          className="min-h-11 rounded-full border border-red-200 px-4 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          아니요, 문제가 있어요
        </button>
      </div>
    </div>
  );
}
