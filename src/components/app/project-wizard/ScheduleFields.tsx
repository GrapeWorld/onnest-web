"use client";

import { projectStageMeta, projectStages } from "@/data/projectSpace";
import { cn } from "@/lib/cn";
import { fieldClass, labelClass, type ProjectWizardValues } from "./shared";

export function ScheduleFields({
  values,
  onChange,
}: {
  values: ProjectWizardValues;
  onChange: (patch: Partial<ProjectWizardValues>) => void;
}) {
  const isResidential = values.spaceCategory === "residential";
  const moveInLabel = isResidential ? "입주 예정일" : "사용 개시 예정일";

  return (
    <div className="grid gap-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-forest">현재 진행 상황</p>
        <div className="flex flex-wrap gap-2">
          {projectStages.map((stage) => {
            const selected = values.projectStage === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => onChange({ projectStage: stage })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
                  selected
                    ? "border-forest bg-forest text-white"
                    : "border-forest/15 bg-white text-forest hover:border-forest/40",
                )}
              >
                {projectStageMeta[stage].label}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold text-forest">
        <input
          type="checkbox"
          checked={values.scheduleUndecided}
          onChange={(event) =>
            onChange({
              scheduleUndecided: event.target.checked,
              moveInDate: "",
              contractDate: "",
            })
          }
          className="h-4 w-4 rounded border-forest/30 text-forest focus:ring-forest"
        />
        일정을 아직 정하지 않았어요
      </label>

      {!values.scheduleUndecided && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={labelClass}>
            계약 예정일 <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="date"
              value={values.contractDate}
              onChange={(event) => onChange({ contractDate: event.target.value })}
              className={fieldClass}
            />
          </label>
          <label className={labelClass}>
            {moveInLabel} <span className="font-normal text-ink/50">선택 입력</span>
            <input
              type="date"
              value={values.moveInDate}
              onChange={(event) => onChange({ moveInDate: event.target.value })}
              className={fieldClass}
            />
          </label>
        </div>
      )}

      <label className={labelClass}>
        프로젝트 이름
        <input
          required
          value={values.name}
          onChange={(event) => onChange({ name: event.target.value })}
          className={fieldClass}
        />
      </label>
    </div>
  );
}
