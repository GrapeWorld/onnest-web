"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { adminPropertySuggestionSchema } from "@/lib/propertySuggestionSchema";
import {
  propertySuggestionCustomerStatusLabels,
  propertySuggestionCustomerStatusClassName,
  type PropertySuggestionCustomerStatus,
} from "@/data/propertySuggestion";
import type { CandidatePropertyTransactionType } from "@/data/candidateProperty";
import {
  PropertySuggestionFieldset,
  toNumberOrNull,
  type PropertySuggestionFormValues,
} from "./PropertySuggestionFieldset";
import { formatDate } from "@/lib/dates";

export type AdminPropertySuggestionItem = {
  id: string;
  sourceUrl: string;
  title: string;
  address: string | null;
  transactionType: string | null;
  price: number | null;
  deposit: number | null;
  monthlyRent: number | null;
  area: number | null;
  roomCount: number | null;
  availableDate: string | null;
  sharedReason: string | null;
  cautionNote: string | null;
  adminMemo: string | null;
  customerStatus: string;
  customerMemo: string | null;
  sharedByName: string;
  withdrawnAt: string | null;
  createdAt: string;
};

function toFormValues(item: AdminPropertySuggestionItem): PropertySuggestionFormValues {
  return {
    sourceUrl: item.sourceUrl,
    title: item.title,
    address: item.address ?? "",
    transactionType: (item.transactionType as CandidatePropertyTransactionType | null) ?? "",
    price: item.price?.toString() ?? "",
    deposit: item.deposit?.toString() ?? "",
    monthlyRent: item.monthlyRent?.toString() ?? "",
    area: item.area?.toString() ?? "",
    roomCount: item.roomCount?.toString() ?? "",
    availableDate: item.availableDate ? item.availableDate.slice(0, 10) : "",
    sharedReason: item.sharedReason ?? "",
    cautionNote: item.cautionNote ?? "",
    adminMemo: item.adminMemo ?? "",
  };
}

function EditPanel({ item, onDone }: { item: AdminPropertySuggestionItem; onDone: () => void }) {
  const router = useRouter();
  const [values, setValues] = useState<PropertySuggestionFormValues>(toFormValues(item));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const price = toNumberOrNull(values.price);
    const deposit = toNumberOrNull(values.deposit);
    const monthlyRent = toNumberOrNull(values.monthlyRent);
    const area = toNumberOrNull(values.area);
    const roomCount = toNumberOrNull(values.roomCount);
    if ([price, deposit, monthlyRent, area, roomCount].some((v) => Number.isNaN(v))) {
      setError("숫자 항목에는 숫자만 입력해주세요.");
      return;
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
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/property-suggestions/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "수정에 실패했습니다.");
        return;
      }
      router.refresh();
      onDone();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 grid min-w-0 gap-6 rounded-2xl bg-cream p-4" noValidate>
      <PropertySuggestionFieldset values={values} onChange={(patch) => setValues((prev) => ({ ...prev, ...patch }))} disabled={saving} />
      {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "저장 중..." : "수정 저장"}
        </button>
        <button
          type="button"
          onClick={onDone}
          disabled={saving}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
        >
          취소
        </button>
      </div>
    </form>
  );
}

function SuggestionCard({ item, canEdit }: { item: AdminPropertySuggestionItem; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = item.customerStatus as PropertySuggestionCustomerStatus;

  async function handleWithdrawConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/property-suggestions/${item.id}/withdraw`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "철회에 실패했습니다.");
        return;
      }
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
      setWithdrawing(false);
    }
  }

  return (
    <li className={`rounded-2xl border border-forest/10 p-4 ${item.withdrawnAt ? "bg-ink/5 opacity-70" : "bg-white"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-forest">{item.title}</p>
        <div className="flex items-center gap-2">
          {item.withdrawnAt && (
            <span className="rounded-full bg-ink/15 px-3 py-1 text-xs font-bold text-ink/60">철회됨</span>
          )}
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${propertySuggestionCustomerStatusClassName[status] ?? "bg-cream text-forest"}`}>
            {propertySuggestionCustomerStatusLabels[status] ?? item.customerStatus}
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink/60">{item.address || "주소 미입력"}</p>
      <p className="mt-1 text-xs text-ink/45">
        {item.sharedByName} 공유 · {formatDate(new Date(item.createdAt))}
      </p>
      {item.adminMemo && (
        <p className="mt-2 rounded-xl bg-cream px-3 py-2 text-xs text-ink/60">내부 메모: {item.adminMemo}</p>
      )}
      {item.customerMemo && (
        <p className="mt-2 rounded-xl bg-sage/10 px-3 py-2 text-xs text-forest">고객 메모: {item.customerMemo}</p>
      )}

      {canEdit && !item.withdrawnAt && (
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setEditing((prev) => !prev)}
            className="text-sm font-semibold text-forest hover:underline"
          >
            {editing ? "수정 닫기" : "수정"}
          </button>
          <button
            type="button"
            onClick={() => setWithdrawing((prev) => !prev)}
            className="text-sm font-semibold text-red-600 hover:underline"
          >
            철회
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>}

      {withdrawing && (
        <div className="mt-3 grid min-w-0 gap-3 rounded-2xl bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-700">
            이 매물 공유를 철회할까요? 고객 화면에서 더 이상 보이지 않지만 운영 이력에는 남습니다.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleWithdrawConfirm}
              disabled={loading}
              className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "철회하는 중..." : "철회 확정"}
            </button>
            <button
              type="button"
              onClick={() => setWithdrawing(false)}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {editing && <EditPanel item={item} onDone={() => setEditing(false)} />}
    </li>
  );
}

export function PropertySuggestionAdminList({
  items,
  canEdit,
}: {
  items: AdminPropertySuggestionItem[];
  canEdit: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-ink/55">아직 공유한 매물이 없습니다.</p>;
  }

  return (
    <ul className="grid min-w-0 gap-4">
      {items.map((item) => (
        <SuggestionCard key={item.id} item={item} canEdit={canEdit} />
      ))}
    </ul>
  );
}
