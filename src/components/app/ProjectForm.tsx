"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { SpaceSelectFields } from "./project-wizard/SpaceSelectFields";
import { TransactionConditionFields } from "./project-wizard/TransactionConditionFields";
import { ScheduleFields } from "./project-wizard/ScheduleFields";
import type { ProjectWizardValues } from "./project-wizard/shared";
import { projectWizardSchema } from "@/lib/projectWizardSchema";

const submitButtonClass =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const cancelLinkClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest hover:border-forest/40";

/** 프로젝트 수정 전용 폼. 생성은 3단계 위저드(project-wizard/ProjectWizard.tsx)를 쓴다. */
export function ProjectForm({
  projectId,
  initialValues,
}: {
  projectId: string;
  initialValues: ProjectWizardValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<ProjectWizardValues>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(patch: Partial<ProjectWizardValues>) {
    setValues((prev) => ({ ...prev, ...patch }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    const parsed = projectWizardSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "입력값을 확인해주세요.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
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
      <form onSubmit={handleSubmit} className="grid gap-8" noValidate>
        <section>
          <h3 className="mb-4 text-lg font-bold text-forest">공간 정보</h3>
          <SpaceSelectFields
            values={values}
            onChange={update}
            onCategoryReset={() =>
              setNotice("공간 유형 변경으로 기존 거래 조건이 초기화됩니다.")
            }
          />
        </section>
        <section>
          <h3 className="mb-4 text-lg font-bold text-forest">거래 조건</h3>
          <TransactionConditionFields values={values} onChange={update} />
        </section>
        <section>
          <h3 className="mb-4 text-lg font-bold text-forest">일정 및 이름</h3>
          <ScheduleFields values={values} onChange={update} />
        </section>

        {notice && (
          <p className="rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
            {notice}
          </p>
        )}
        {error && <p className="text-sm font-semibold text-red-600">{error}</p>}

        <div className="mt-2 flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={loading} className={submitButtonClass}>
            {loading ? "저장 중..." : "수정 저장"}
          </button>
          <Link href={`/projects/${projectId}`} className={cancelLinkClass}>
            취소
          </Link>
        </div>
      </form>
    </Card>
  );
}
