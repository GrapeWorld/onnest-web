"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import type { SpaceCategory, TransactionType } from "@/data/projectSpace";
import {
  projectWizardSchema,
  spaceStepSchema,
  transactionStepSchema,
} from "@/lib/projectWizardSchema";
import { suggestProjectName } from "@/lib/projectName";
import { Stepper } from "./Stepper";
import { SpaceSelectFields } from "./SpaceSelectFields";
import { TransactionConditionFields } from "./TransactionConditionFields";
import { ScheduleFields } from "./ScheduleFields";
import { SummaryCard } from "./SummaryCard";
import {
  emptyProjectWizardValues,
  PROJECT_DRAFT_STORAGE_KEY,
  SOURCE_CANDIDATE_STORAGE_KEY,
  type ProjectWizardValues,
} from "./shared";

/**
 * localStorage는 컴포넌트 바깥의 진짜 외부 저장소라 useState의 lazy
 * initializer에서 한 번만 읽는다 — useEffect + setState로 하면 첫 렌더 뒤에
 * 한 번 더 리렌더가 끼어든다. 서버 렌더링 시점(window 없음)에는 빈 값으로
 * 시작한다.
 */
function loadDraft(): ProjectWizardValues {
  if (typeof window === "undefined") return emptyProjectWizardValues;
  try {
    const raw = window.localStorage.getItem(PROJECT_DRAFT_STORAGE_KEY);
    if (!raw) return emptyProjectWizardValues;
    return JSON.parse(raw) as ProjectWizardValues;
  } catch {
    return emptyProjectWizardValues;
  }
}

const submitButtonClass =
  "inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-forest px-5 py-3 text-sm font-semibold text-white shadow-soft transition duration-300 hover:-translate-y-0.5 hover:bg-navy hover:shadow-glow focus-visible:outline focus-visible:outline-4 focus-visible:outline-mint/80 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";
const secondaryButtonClass =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-forest/15 bg-white px-5 py-3 text-sm font-semibold text-forest transition duration-300 hover:border-forest/40 hover:shadow-card disabled:cursor-not-allowed disabled:opacity-60";

export function ProjectWizard() {
  const router = useRouter();
  // 마운트 시 localStorage에 남은 임시 저장 값을 복원한다(뒤로가기·새로고침에도
  // 유지 — 규칙 14, 15). 서버/DB는 건드리지 않는다(사용자 확인: localStorage만).
  const [values, setValues] = useState<ProjectWizardValues>(loadDraft);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const nameEdited = useRef(Boolean(values.name));

  function update(patch: Partial<ProjectWizardValues>) {
    if (patch.name !== undefined) nameEdited.current = true;
    setValues((prev) => ({ ...prev, ...patch }));
  }

  function saveDraft() {
    window.localStorage.setItem(PROJECT_DRAFT_STORAGE_KEY, JSON.stringify(values));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  }

  function goNext() {
    setError(null);
    if (step === 1) {
      const result = spaceStepSchema.safeParse(values);
      if (!result.success) {
        setError(result.error.issues[0]?.message ?? "입력값을 확인해주세요.");
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      const result = transactionStepSchema.safeParse(values);
      if (!result.success) {
        setError(result.error.issues[0]?.message ?? "입력값을 확인해주세요.");
        return;
      }
      // 3단계 진입 시 이름을 아직 직접 고치지 않았다면 자동으로 제안한다.
      if (!nameEdited.current && values.spaceCategory && values.spaceSubtype && values.transactionType) {
        const suggested = suggestProjectName({
          address: values.addressPending ? undefined : values.address,
          spaceCategory: values.spaceCategory as SpaceCategory,
          spaceSubtype: values.spaceSubtype,
          transactionType: values.transactionType as TransactionType,
        });
        setValues((prev) => ({ ...prev, name: suggested }));
      }
      setStep(3);
    }
  }

  function goBack() {
    setError(null);
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2 | 3);
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
      // 매물 후보에서 "이 매물로 프로젝트 만들기"로 들어온 경우에만 존재한다
      // (ConvertToProjectButton). 있으면 함께 보내 생성 직후 그 후보와 연결한다
      // — 서버가 소유권을 다시 확인하므로 위조된 id를 보내도 연결되지 않는다.
      const sourceCandidatePropertyId = window.localStorage.getItem(SOURCE_CANDIDATE_STORAGE_KEY);
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...parsed.data,
          ...(sourceCandidatePropertyId ? { sourceCandidatePropertyId } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "저장에 실패했습니다.");
        return;
      }

      window.localStorage.removeItem(PROJECT_DRAFT_STORAGE_KEY);
      window.localStorage.removeItem(SOURCE_CANDIDATE_STORAGE_KEY);
      router.push(`/projects/${data.id}`);
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <Stepper current={step} />
      <Card>
        <form onSubmit={handleSubmit} className="grid gap-6 min-w-0" noValidate>
          {step === 1 && (
            <SpaceSelectFields
              values={values}
              onChange={update}
              onCategoryReset={() =>
                setNotice("공간 유형 변경으로 기존 거래 조건이 초기화됩니다.")
              }
            />
          )}
          {step === 2 && (
            <TransactionConditionFields values={values} onChange={update} />
          )}
          {step === 3 && (
            <div className="grid gap-6">
              <ScheduleFields values={values} onChange={update} />
              <SummaryCard values={values} onEditStep={setStep} />
            </div>
          )}

          {notice && (
            <p className="rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-forest">
              {notice}
            </p>
          )}
          {error && <p className="text-sm font-semibold text-red-600">{error}</p>}
          {draftSaved && (
            <p className="text-sm font-semibold text-forest">임시 저장했습니다.</p>
          )}

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            {step > 1 && (
              <button type="button" onClick={goBack} className={secondaryButtonClass}>
                이전
              </button>
            )}
            <button type="button" onClick={saveDraft} className={secondaryButtonClass}>
              임시 저장
            </button>
            {step < 3 ? (
              <button type="button" onClick={goNext} className={submitButtonClass}>
                다음
              </button>
            ) : (
              <button type="submit" disabled={loading} className={submitButtonClass}>
                {loading ? "만드는 중..." : "프로젝트 만들기"}
              </button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
