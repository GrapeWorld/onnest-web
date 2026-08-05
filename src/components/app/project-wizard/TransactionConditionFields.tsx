"use client";

import { useState } from "react";
import {
  getAdditionalFields,
  transactionFieldsByType,
  transactionOptionsByCategory,
  transactionTypeLabels,
  type TransactionType,
} from "@/data/projectSpace";
import { cn } from "@/lib/cn";
import { DynamicField } from "./DynamicField";
import { type ProjectWizardValues } from "./shared";

export function TransactionConditionFields({
  values,
  onChange,
}: {
  values: ProjectWizardValues;
  onChange: (patch: Partial<ProjectWizardValues>) => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  if (!values.spaceCategory || !values.spaceSubtype) {
    return (
      <p className="rounded-2xl bg-cream px-4 py-3 text-sm text-ink/60">
        먼저 1단계에서 공간 유형을 선택해주세요.
      </p>
    );
  }

  const options = transactionOptionsByCategory[values.spaceCategory];
  const fields = values.transactionType
    ? transactionFieldsByType[values.transactionType as TransactionType]
    : [];
  const additionalFields = getAdditionalFields(values.spaceCategory, values.spaceSubtype);

  function updateDetail(key: string, value: string) {
    onChange({ details: { ...values.details, [key]: value } });
  }

  return (
    <div className="grid gap-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-forest">거래 유형</p>
        <div className="flex flex-wrap gap-2">
          {options.map((type) => {
            const selected = values.transactionType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => onChange({ transactionType: type, details: {} })}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-semibold transition duration-200",
                  selected
                    ? "border-forest bg-forest text-white"
                    : "border-forest/15 bg-white text-forest hover:border-forest/40",
                )}
              >
                {transactionTypeLabels[type]}
              </button>
            );
          })}
        </div>
      </div>

      {values.transactionType === "jeonse" && (
        <p className="rounded-2xl bg-mint/60 px-4 py-3 text-xs leading-6 text-forest">
          온네스트는 보증보험 가입 가능 여부를 판정하거나 보장하지 않습니다.
          공식 채널 확인이 필요한 시점을 안내해드립니다.
        </p>
      )}

      {fields.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <DynamicField
              key={field.key}
              field={field}
              value={values.details[field.key] ?? ""}
              onChange={(value) => updateDetail(field.key, value)}
            />
          ))}
        </div>
      )}

      {additionalFields.length > 0 && (
        <div className="rounded-2xl border border-forest/10">
          <button
            type="button"
            onClick={() => setDetailsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-forest"
          >
            상세 조건 추가 <span className="font-normal text-ink/50">선택 입력</span>
            <span className="text-ink/40">{detailsOpen ? "▲" : "▼"}</span>
          </button>
          {detailsOpen && (
            <div className="grid gap-4 border-t border-forest/10 p-4 sm:grid-cols-2">
              {additionalFields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  value={values.details[field.key] ?? ""}
                  onChange={(value) => updateDetail(field.key, value)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
