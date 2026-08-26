"use client";

import { useId, useState } from "react";
import {
  adminExportSections,
  adminExportSectionLabels,
  customerExportDefaultSections,
  projectExportDefaultSections,
  projectScopeUnsupportedSections,
  type AdminExportSection,
} from "@/data/adminExport";

type Scope =
  | { type: "CUSTOMER"; customerId: string; label: string }
  | { type: "PROJECT"; projectId: string; label: string };

function extractFilename(contentDisposition: string | null): string {
  const match = contentDisposition?.match(/filename="([^"]+)"/);
  return match?.[1] ?? "onnest-export.xlsx";
}

/**
 * 관리자 Excel 내보내기 폼. 고객 한 명 또는 프로젝트 한 개 범위로만
 * 동작한다(전체 고객 일괄 내보내기는 이번 릴리스에서 지원하지 않는다).
 * 생성 전에 대상·범위를 다시 보여주는 확인 단계를 거친다 —
 * window.confirm 대신 포커스 가능한 패널을 쓴다(스크린리더 접근성).
 */
export function AdminExportForm({ scope }: { scope: Scope }) {
  const formId = useId();
  const availableSections =
    scope.type === "PROJECT"
      ? adminExportSections.filter((s) => !projectScopeUnsupportedSections.includes(s))
      : adminExportSections;
  const defaultSections = scope.type === "CUSTOMER" ? customerExportDefaultSections : projectExportDefaultSections;

  const [sections, setSections] = useState<Set<AdminExportSection>>(new Set(defaultSections));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  function toggleSection(section: AdminExportSection) {
    setSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
    setConfirming(false);
    setSuccessMessage(null);
  }

  function validate(): string | null {
    if (sections.size === 0) return "포함할 데이터 종류를 하나 이상 선택해주세요.";
    if (!reason.trim()) return "내보내기 사유를 입력해주세요.";
    if (dateFrom && dateTo && dateFrom > dateTo) return "종료일은 시작일보다 이후여야 합니다.";
    return null;
  }

  function handleReviewClick(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setConfirming(true);
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const res = await fetch("/api/admin/exports/customer-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exportType: scope.type,
          customerId: scope.type === "CUSTOMER" ? scope.customerId : undefined,
          projectId: scope.type === "PROJECT" ? scope.projectId : undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          sections: Array.from(sections),
          reason,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "내보내기에 실패했습니다.");
        return;
      }

      const blob = await res.blob();
      const filename = extractFilename(res.headers.get("Content-Disposition"));
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      setSuccessMessage(`${filename} 파일을 생성했습니다.`);
      setConfirming(false);
      setReason("");
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleReviewClick} className="grid min-w-0 gap-5" noValidate>
      <p className="rounded-2xl bg-cream px-4 py-3 text-xs text-ink/60">
        내보낸 파일에는 개인정보가 포함될 수 있습니다. 승인된 업무 목적으로만 사용하고, 사용이 끝나면 안전하게 삭제해 주세요.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-semibold text-forest">
          시작일 <span className="font-normal text-ink/50">선택 입력</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
              setConfirming(false);
            }}
            disabled={loading}
            className="box-border w-full min-w-0 rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold text-forest">
          종료일 <span className="font-normal text-ink/50">선택 입력</span>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
              setConfirming(false);
            }}
            disabled={loading}
            className="box-border w-full min-w-0 rounded-2xl border border-forest/15 px-4 py-3 text-base text-forest outline-none focus:border-forest disabled:opacity-60"
          />
        </label>
      </div>

      <fieldset className="grid gap-2">
        <legend className="text-sm font-semibold text-forest">포함할 데이터</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableSections.map((section) => {
            const inputId = `${formId}-${section}`;
            return (
              <label
                key={section}
                htmlFor={inputId}
                className="flex min-h-11 items-center gap-2 rounded-2xl border border-forest/10 px-3 py-2 text-sm text-ink/75"
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={sections.has(section)}
                  onChange={() => toggleSection(section)}
                  disabled={loading}
                  className="h-4 w-4 shrink-0"
                />
                {adminExportSectionLabels[section]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <label className="grid gap-1 text-sm font-semibold text-forest">
        내보내기 사유 (필수)
        <textarea
          value={reason}
          onChange={(event) => {
            setReason(event.target.value);
            setConfirming(false);
          }}
          disabled={loading}
          rows={2}
          placeholder="예: 고객 민원 대응을 위한 이용 내역 확인"
          className="box-border w-full min-w-0 rounded-2xl border border-forest/15 px-4 py-3 text-base outline-none focus:border-forest disabled:opacity-60"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm font-semibold text-red-600">
          {error}
        </p>
      )}
      {successMessage && (
        <p role="status" aria-live="polite" className="text-sm font-semibold text-forest">
          {successMessage}
        </p>
      )}

      {confirming ? (
        <div className="grid min-w-0 gap-3 rounded-2xl bg-cream p-4" role="alertdialog" aria-label="내보내기 확인">
          <p className="text-sm font-semibold text-forest">
            &quot;{scope.label}&quot;의 데이터를 Excel로 내려받으시겠어요? 선택한 {sections.size}개 항목이 포함됩니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "생성하는 중..." : "Excel 생성"}
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
          내보내기 내용 확인
        </button>
      )}
    </form>
  );
}
