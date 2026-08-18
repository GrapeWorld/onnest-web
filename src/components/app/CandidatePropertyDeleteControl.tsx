"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CandidatePropertyDeleteControl({ candidateId }: { candidateId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/my/candidate-properties/${candidateId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      router.push("/my/candidate-properties");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
      >
        매물 후보 삭제
      </button>
    );
  }

  return (
    <div className="grid w-full min-w-0 gap-3 rounded-2xl bg-red-50 p-4">
      <p className="text-sm font-semibold text-red-700">
        삭제하면 되돌릴 수 없습니다. 이 매물의 메모·체크리스트도 함께 사라집니다. 정말 삭제할까요?
      </p>
      {error && <p className="text-sm font-semibold text-red-700">{error}</p>}
      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? "삭제 중..." : "삭제 확정"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={deleting}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
        >
          취소
        </button>
      </div>
    </div>
  );
}
