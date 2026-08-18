"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  allowedExtensionLabel,
  allowedMimeTypes,
  formatFileSize,
  maxFileSizeLabel,
  validateUpload,
} from "@/lib/documents";
import {
  partnerVerificationDocumentTypeLabels,
  type PartnerVerificationDocumentType,
} from "@/data/partnerVerificationDocuments";

export type PartnerVerificationDocumentItem = {
  id: string;
  type: string;
  filename: string;
  size: number;
  createdAt: string;
};

/** 업체 상세의 "인증 서류" 섹션 — 관리자가 사업자등록증·통장사본을 올리고 관리한다. */
export function PartnerVerificationDocuments({
  partnerId,
  documents,
  storageReady,
}: {
  partnerId: string;
  documents: PartnerVerificationDocumentItem[];
  storageReady: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<PartnerVerificationDocumentType>("BUSINESS_REGISTRATION");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);

    const invalid = validateUpload(file);
    if (invalid) {
      setError(invalid);
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("type", type);
      const res = await fetch(`/api/admin/partners/${partnerId}/documents`, {
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
      const res = await fetch(`/api/admin/partners/${partnerId}/documents/${docId}`, {
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
    <div className="mt-3 rounded-xl bg-cream/60 p-3">
      <p className="mb-2 text-xs font-bold text-forest">인증 서류</p>

      {storageReady ? (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={type}
            onChange={(event) => setType(event.target.value as PartnerVerificationDocumentType)}
            disabled={uploading}
            className="box-border w-full min-w-0 max-w-full rounded-xl border border-forest/15 bg-white px-3 py-2 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
          >
            {Object.entries(partnerVerificationDocumentTypeLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-forest/15 bg-white px-4 py-2 text-xs font-semibold text-forest hover:border-forest/40">
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
            {uploading ? "올리는 중..." : "파일 선택"}
          </label>
          <span className="text-xs text-ink/45">
            {allowedExtensionLabel} · 최대 {maxFileSizeLabel}
          </span>
        </div>
      ) : (
        <p className="text-xs text-ink/50">파일 스토리지가 아직 설정되지 않았습니다.</p>
      )}

      {error && <p className="mt-2 text-xs font-semibold text-red-600">{error}</p>}

      {documents.length > 0 && (
        <ul className="mt-3 grid gap-2">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-forest">
                  {partnerVerificationDocumentTypeLabels[
                    doc.type as PartnerVerificationDocumentType
                  ] ?? doc.type}
                </p>
                <p className="break-all text-xs text-ink/55">
                  {doc.filename} · {formatFileSize(doc.size)} · {doc.createdAt}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <a
                  href={`/api/admin/partners/${partnerId}/documents/${doc.id}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 px-3 text-xs font-semibold text-forest hover:border-forest/40"
                >
                  내려받기
                </a>
                <button
                  type="button"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                >
                  {deletingId === doc.id ? "삭제 중..." : "삭제"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
