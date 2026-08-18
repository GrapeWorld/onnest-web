"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import {
  allowedExtensionLabel,
  allowedMimeTypes,
  formatFileSize,
  maxFileSizeLabel,
  validateUpload,
} from "@/lib/documents";

export type DocumentItem = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt: string;
};

export function DocumentManager({
  projectId,
  documents,
  storageReady,
}: {
  projectId: string;
  documents: DocumentItem[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    // 서버도 같은 규칙으로 다시 검사한다. 여기서는 빠른 피드백만 준다.
    const invalid = validateUpload(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: "POST",
        body,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "업로드에 실패했습니다.");
        return;
      }

      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(docId: string) {
    setDeletingId(docId);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "삭제에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="grid gap-5">
      <Card>
        <h2 className="text-xl font-black text-forest">파일 올리기</h2>

        {storageReady ? (
          <>
            <label className="mt-5 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-forest/30 bg-cream p-10 text-center transition hover:border-forest/60">
              <input
                ref={inputRef}
                type="file"
                accept={allowedMimeTypes.join(",")}
                disabled={uploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleFile(file);
                }}
                className="sr-only"
              />
              <span className="text-base font-bold text-forest">
                {uploading ? "올리는 중..." : "파일 선택"}
              </span>
              <span className="mt-2 text-sm text-ink/60">
                {allowedExtensionLabel} · 최대 {maxFileSizeLabel}
              </span>
            </label>
          </>
        ) : (
          <div className="mt-5 rounded-2xl bg-cream p-6 text-sm leading-7 text-ink/70">
            <p className="font-bold text-forest">
              파일 스토리지가 아직 연결되지 않았습니다.
            </p>
            <p className="mt-2">
              온네스트는 서버리스 환경에 배포되므로 파일을 서버 디스크에 보관할
              수 없습니다. 외부 스토리지를 연결하면 이 화면에서 바로 업로드할 수
              있습니다.
            </p>
          </div>
        )}

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold leading-6 text-red-700"
          >
            {error}
          </p>
        )}

        <p className="mt-4 text-sm leading-7 text-ink/60">
          주민등록번호, 계좌번호처럼 꼭 필요하지 않은 민감정보는 가리거나 지우고
          올려주세요. 올린 파일은 본인만 볼 수 있습니다.
        </p>
      </Card>

      <Card>
        <h2 className="text-xl font-black text-forest">
          보관 중인 문서{" "}
          <span className="text-base font-bold text-sage">
            {documents.length}건
          </span>
        </h2>

        {documents.length === 0 ? (
          <p className="mt-5 text-sm text-ink/60">
            아직 올린 문서가 없습니다. 계약서, 등기부등본, 입주 전후 사진을
            보관해두면 나중에 확인하기 좋습니다.
          </p>
        ) : (
          <ul className="mt-5 grid gap-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-col gap-3 rounded-2xl bg-cream px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="break-all font-semibold text-forest">
                    {doc.filename}
                  </p>
                  <p className="mt-1 text-xs text-ink/55">
                    {formatFileSize(doc.size)} · {doc.createdAt}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <a
                    href={`/api/projects/${projectId}/documents/${doc.id}`}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-4 py-2 text-sm font-semibold text-forest hover:border-forest/40"
                  >
                    내려받기
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(doc.id)}
                    disabled={deletingId === doc.id}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {deletingId === doc.id ? "삭제 중..." : "삭제"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
