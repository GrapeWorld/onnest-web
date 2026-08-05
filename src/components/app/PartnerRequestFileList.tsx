"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { serviceRequestFileCategoryLabels } from "@/data/serviceRequestFiles";
import { formatFileSize } from "@/lib/documents";

type FileRow = {
  id: string;
  filename: string;
  category: string | null;
  size: number;
  createdAt: string;
  uploadedByRole: string;
  uploadedByName: string | null;
};

export function PartnerRequestFileList({
  requestId,
  files,
}: {
  requestId: string;
  files: FileRow[];
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete(fileId: string) {
    if (!window.confirm("이 파일을 삭제할까요?")) return;

    setDeletingId(fileId);
    setError(null);
    try {
      const res = await fetch(`/api/partner/service-requests/${requestId}/files/${fileId}`, {
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

  if (files.length === 0) {
    return <p className="text-sm text-ink/55">업로드된 파일이 없습니다.</p>;
  }

  return (
    <div className="grid gap-2">
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <ul className="grid gap-2">
        {files.map((file) => (
          <li
            key={file.id}
            className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-forest">
                {file.category ? `[${serviceRequestFileCategoryLabels[file.category as keyof typeof serviceRequestFileCategoryLabels] ?? file.category}] ` : ""}
                {file.filename}
              </p>
              <p className="mt-0.5 text-xs text-ink/50">
                {formatFileSize(file.size)} ·{" "}
                {file.uploadedByRole === "PARTNER" ? "업체" : "고객"}
                {file.uploadedByName ? ` (${file.uploadedByName})` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <a
                href={`/api/partner/service-requests/${requestId}/files/${file.id}`}
                className="text-xs font-semibold text-forest hover:underline"
              >
                내려받기
              </a>
              {file.uploadedByRole === "PARTNER" && (
                <button
                  type="button"
                  onClick={() => handleDelete(file.id)}
                  disabled={deletingId === file.id}
                  className="text-xs font-semibold text-red-700 hover:underline disabled:opacity-50"
                >
                  {deletingId === file.id ? "삭제 중..." : "삭제"}
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
