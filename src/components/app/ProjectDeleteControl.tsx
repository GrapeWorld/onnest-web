"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";

/**
 * 프로젝트 삭제는 되돌릴 수 없고 연결된 기록까지 사라지므로,
 * 프로젝트 이름을 그대로 입력해야 버튼이 열리게 한다.
 */
export function ProjectDeleteControl({
  projectId,
  projectName,
  counts,
}: {
  projectId: string;
  projectName: string;
  counts: {
    steps: number;
    events: number;
    requests: number;
    handover: boolean;
  };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const willDelete = [
    counts.steps > 0 && `단계 진행 상태 ${counts.steps}건`,
    counts.events > 0 && `일정 ${counts.events}건`,
    counts.requests > 0 && `서비스 신청 ${counts.requests}건`,
    counts.handover && "인수인계서 1건",
  ].filter(Boolean) as string[];

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }

      router.push("/my");
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="border-red-200 hover:translate-y-0 hover:shadow-card">
      <h2 className="text-lg font-black text-red-700">프로젝트 삭제</h2>
      <p className="mt-2 text-sm leading-7 text-ink/65">
        삭제하면 되돌릴 수 없습니다.
        {willDelete.length > 0 ? (
          <> 이 프로젝트의 {willDelete.join(", ")}도 함께 사라집니다.</>
        ) : (
          <> 아직 이 프로젝트에 저장된 기록은 없습니다.</>
        )}
      </p>

      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-full border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
        >
          삭제하기
        </button>
      ) : (
        <div className="mt-5 grid gap-3">
          <label className="grid gap-2 text-sm font-semibold text-forest">
            확인을 위해 프로젝트 이름{" "}
            <span className="font-black">{projectName}</span> 을(를)
            입력해주세요.
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              className="rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest"
              placeholder={projectName}
              autoComplete="off"
            />
          </label>

          {error && (
            <p role="alert" className="text-sm font-semibold text-red-700">
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting || typed !== projectName}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting ? "삭제 중..." : "영구 삭제"}
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setTyped("");
                setError(null);
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
