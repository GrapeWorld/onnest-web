"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  serviceRequestFileCategories,
  serviceRequestFileCategoryLabels,
  type ServiceRequestFileCategory,
} from "@/data/serviceRequestFiles";
import { allowedExtensionLabel, maxFileSizeLabel } from "@/lib/documents";

export function PartnerRequestFileUpload({ requestId }: { requestId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState<ServiceRequestFileCategory>("QUOTE");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("올릴 파일을 선택해주세요.");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("category", category);

      const res = await fetch(`/api/partner/service-requests/${requestId}/files`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "업로드에 실패했습니다.");
        return;
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-2 min-w-0">
      <select
        value={category}
        onChange={(event) => setCategory(event.target.value as ServiceRequestFileCategory)}
        disabled={uploading}
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
      >
        {serviceRequestFileCategories.map((option) => (
          <option key={option} value={option}>
            {serviceRequestFileCategoryLabels[option]}
          </option>
        ))}
      </select>
      <input
        ref={fileInputRef}
        type="file"
        disabled={uploading}
        className="box-border w-full min-w-0 max-w-full rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
      />
      <p className="text-xs text-ink/45">
        {allowedExtensionLabel} · 최대 {maxFileSizeLabel}
      </p>
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={uploading}
        className="justify-self-start rounded-full bg-forest px-5 py-2.5 text-sm font-bold text-white hover:bg-forest/90 disabled:opacity-60"
      >
        {uploading ? "업로드 중..." : "파일 업로드"}
      </button>
    </form>
  );
}
