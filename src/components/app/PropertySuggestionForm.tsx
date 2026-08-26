"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminPropertySuggestionSchema, type AdminPropertySuggestionInput } from "@/lib/propertySuggestionSchema";
import {
  PropertySuggestionFieldset,
  emptyPropertySuggestionValues,
  toNumberOrNull,
  type PropertySuggestionFormValues,
} from "./PropertySuggestionFieldset";

/**
 * 관리자가 프로젝트에 매물을 공유하는 폼. 원본 URL은 저장·재방문 용도로만
 * 쓰고, 이 컴포넌트도 서버도 그 URL을 직접 요청(fetch)하지 않는다.
 * 공유 전 한 번 더 확인하도록 confirm 단계를 둔다 — CandidatePropertyDeleteControl의
 * confirm-state 패턴과 같은 원칙(중요한 동작은 즉시 실행하지 않는다).
 */
export function PropertySuggestionForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [values, setValues] = useState<PropertySuggestionFormValues>(emptyPropertySuggestionValues);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function update(patch: Partial<PropertySuggestionFormValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
    setConfirming(false);
  }

  function buildPayload(): { error: string } | { data: AdminPropertySuggestionInput } {
    const price = toNumberOrNull(values.price);
    const deposit = toNumberOrNull(values.deposit);
    const monthlyRent = toNumberOrNull(values.monthlyRent);
    const area = toNumberOrNull(values.area);
    const roomCount = toNumberOrNull(values.roomCount);
    if ([price, deposit, monthlyRent, area, roomCount].some((v) => Number.isNaN(v))) {
      return { error: "숫자 항목에는 숫자만 입력해주세요." };
    }

    const parsed = adminPropertySuggestionSchema.safeParse({
      sourceUrl: values.sourceUrl,
      title: values.title,
      address: values.address,
      transactionType: values.transactionType || null,
      price,
      deposit,
      monthlyRent,
      area,
      roomCount,
      availableDate: values.availableDate,
      sharedReason: values.sharedReason,
      cautionNote: values.cautionNote,
      adminMemo: values.adminMemo,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." };
    }
    return { data: parsed.data };
  }

  function handleReviewClick(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const result = buildPayload();
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setConfirming(true);
  }

  async function handleConfirm() {
    const result = buildPayload();
    if ("error" in result) {
      setError(result.error);
      setConfirming(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/projects/${projectId}/property-suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "공유에 실패했습니다.");
        setConfirming(false);
        return;
      }

      setValues(emptyPropertySuggestionValues);
      setConfirming(false);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
      setConfirming(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleReviewClick} className="grid min-w-0 gap-6" noValidate>
      <PropertySuggestionFieldset values={values} onChange={update} disabled={loading} />

      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

      {confirming ? (
        <div className="grid min-w-0 gap-3 rounded-2xl bg-cream p-4">
          <p className="text-sm font-semibold text-forest">
            &quot;{values.title || "제목 없음"}&quot; 매물을 고객에게 공유하시겠어요? 공유 후에도 내용은 수정할 수 있습니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "공유하는 중..." : "고객에게 공유하기"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center self-start rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow"
        >
          공유 내용 확인
        </button>
      )}
    </form>
  );
}
