"use client";

import {
  spaceCategories,
  spaceCategoryMeta,
  subtypesByCategory,
  type SpaceCategory,
} from "@/data/projectSpace";
import { cn } from "@/lib/cn";
import { applyCategoryChange, fieldClass, labelClass, type ProjectWizardValues } from "./shared";

export function SpaceSelectFields({
  values,
  onChange,
  onCategoryReset,
}: {
  values: ProjectWizardValues;
  onChange: (patch: Partial<ProjectWizardValues>) => void;
  /** 대분류 변경으로 거래유형이 초기화됐을 때 안내 문구를 보여주기 위한 콜백. */
  onCategoryReset: () => void;
}) {
  function selectCategory(category: SpaceCategory) {
    const { values: next, transactionWasReset } = applyCategoryChange(values, category);
    onChange(next);
    if (transactionWasReset) onCategoryReset();
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-forest">공간 대분류</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {spaceCategories.map((category) => {
            const meta = spaceCategoryMeta[category];
            const Icon = meta.icon;
            const selected = values.spaceCategory === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => selectCategory(category)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition duration-200",
                  selected
                    ? "border-forest bg-mint/50 shadow-card"
                    : "border-forest/15 bg-white hover:border-forest/40",
                )}
              >
                <Icon className="h-6 w-6 text-forest" strokeWidth={2} />
                <p className="mt-3 font-bold text-forest">{meta.label}</p>
                <p className="mt-1 text-xs leading-5 text-ink/60">{meta.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {values.spaceCategory && (
        <div>
          <p className="mb-3 text-sm font-semibold text-forest">세부 공간 유형</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {subtypesByCategory[values.spaceCategory].map((subtype) => {
              const selected = values.spaceSubtype === subtype.value;
              return (
                <button
                  key={subtype.value}
                  type="button"
                  onClick={() => onChange({ spaceSubtype: subtype.value })}
                  className={cn(
                    "rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition duration-200",
                    selected
                      ? "border-forest bg-mint/50 text-forest"
                      : "border-forest/15 bg-white text-ink/70 hover:border-forest/40",
                  )}
                >
                  {subtype.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-forest">
          <input
            type="checkbox"
            checked={values.addressPending}
            onChange={(event) =>
              onChange({ addressPending: event.target.checked, address: "" })
            }
            className="h-4 w-4 rounded border-forest/30 text-forest focus:ring-forest"
          />
          아직 주소를 정하지 않았어요
        </label>

        {values.addressPending ? (
          <p className="rounded-2xl bg-cream px-4 py-3 text-sm leading-6 text-ink/70">
            아직 공간을 결정하지 않았다면 주소 없이 프로젝트를 먼저 만들 수 있습니다.
          </p>
        ) : (
          <>
            <label className={labelClass}>
              도로명 주소
              <input
                value={values.address}
                onChange={(event) => onChange({ address: event.target.value })}
                className={fieldClass}
                placeholder="예: ○○시 ○○구 ○○로 00"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={labelClass}>
                상세 주소 <span className="font-normal text-ink/50">선택 입력</span>
                <input
                  value={values.addressDetail}
                  onChange={(event) => onChange({ addressDetail: event.target.value })}
                  className={fieldClass}
                />
              </label>
              <label className={labelClass}>
                동·호수 또는 층 <span className="font-normal text-ink/50">선택 입력</span>
                <input
                  value={values.unitNumber}
                  onChange={(event) => onChange({ unitNumber: event.target.value })}
                  className={fieldClass}
                />
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
