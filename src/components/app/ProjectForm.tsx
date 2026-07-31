"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { spaceTypes } from "@/data/inquiries";

const fieldClass =
  "rounded-2xl border border-forest/15 px-4 py-3 text-base font-normal text-ink outline-none focus:border-forest";

export type ProjectFormValues = {
  name: string;
  spaceType: string;
  address: string;
  moveInDate: string;
  budget: string;
};

export function ProjectForm({
  projectId,
  initialValues,
}: {
  projectId?: string;
  initialValues?: ProjectFormValues;
}) {
  const router = useRouter();
  const isEdit = Boolean(projectId);
  const [form, setForm] = useState<ProjectFormValues>(
    initialValues ?? {
      name: "",
      spaceType: spaceTypes[0],
      address: "",
      moveInDate: "",
      budget: "",
    },
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: keyof ProjectFormValues) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(
        isEdit ? `/api/projects/${projectId}` : "/api/projects",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      router.push(`/projects/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid gap-4" noValidate>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          프로젝트 이름
          <input
            required
            value={form.name}
            onChange={update("name")}
            className={fieldClass}
            placeholder="예: 별내 오피스텔 입주"
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          공간 유형
          <select
            value={form.spaceType}
            onChange={update("spaceType")}
            className={fieldClass}
          >
            {spaceTypes.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm font-semibold text-forest">
          주소 <span className="font-normal text-ink/50">선택 입력</span>
          <input
            value={form.address}
            onChange={update("address")}
            className={fieldClass}
            placeholder="예: 남양주시 별내동"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-semibold text-forest">
            입주 예정일{" "}
            <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="date"
              value={form.moveInDate}
              onChange={update("moveInDate")}
              className={fieldClass}
            />
          </label>
          <label className="grid gap-2 text-sm font-semibold text-forest">
            예산 범위 <span className="font-normal text-ink/50">선택 입력</span>
            <input
              value={form.budget}
              onChange={update("budget")}
              className={fieldClass}
              placeholder="예: 보증금 1억 / 월 60만원"
            />
          </label>
        </div>
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? "저장 중..." : isEdit ? "수정 저장" : "프로젝트 만들기"}
          </button>
          {isEdit && (
            <Link
              href={`/projects/${projectId}`}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40"
            >
              취소
            </Link>
          )}
        </div>
      </form>
    </Card>
  );
}
