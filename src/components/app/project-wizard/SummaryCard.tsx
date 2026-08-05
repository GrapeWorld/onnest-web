"use client";

import { Card } from "@/components/ui/Card";
import {
  projectStageMeta,
  spaceCategoryMeta,
  subtypesByCategory,
  transactionTypeLabels,
  type SpaceCategory,
  type TransactionType,
  type ProjectStage,
} from "@/data/projectSpace";
import type { ProjectWizardValues } from "./shared";

function Row({
  label,
  value,
  onEdit,
}: {
  label: string;
  value: string;
  onEdit: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-forest/10 py-3 last:border-0">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-sage">{label}</p>
        <p className="mt-1 text-sm font-semibold text-forest">{value || "미입력"}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="shrink-0 text-xs font-semibold text-forest hover:underline"
      >
        수정
      </button>
    </div>
  );
}

export function SummaryCard({
  values,
  onEditStep,
}: {
  values: ProjectWizardValues;
  onEditStep: (step: 1 | 2 | 3) => void;
}) {
  const category = values.spaceCategory as SpaceCategory;
  const subtypeLabel =
    subtypesByCategory[category]?.find((s) => s.value === values.spaceSubtype)?.label ?? "";
  const transactionLabel = values.transactionType
    ? transactionTypeLabels[values.transactionType as TransactionType]
    : "";

  const addressValue = values.addressPending
    ? "주소 미정"
    : [values.address, values.addressDetail, values.unitNumber].filter(Boolean).join(" ");

  const scheduleValue = values.scheduleUndecided
    ? "일정 미정"
    : [
        values.contractDate && `계약 ${values.contractDate}`,
        values.moveInDate &&
          `${category === "residential" ? "입주" : "사용 개시"} ${values.moveInDate}`,
      ]
        .filter(Boolean)
        .join(" · ");

  const stageLabel = values.projectStage
    ? projectStageMeta[values.projectStage as ProjectStage].label
    : "";

  const detailEntries = Object.entries(values.details).filter(([, v]) => v);

  return (
    <Card className="bg-cream/60">
      <p className="text-sm font-bold text-sage">최종 확인</p>
      <div className="mt-2">
        <Row label="프로젝트 이름" value={values.name} onEdit={() => onEditStep(3)} />
        <Row
          label="공간 유형"
          value={`${spaceCategoryMeta[category]?.label ?? ""} · ${subtypeLabel}`}
          onEdit={() => onEditStep(1)}
        />
        <Row label="주소" value={addressValue} onEdit={() => onEditStep(1)} />
        <Row label="거래 유형" value={transactionLabel} onEdit={() => onEditStep(2)} />
        {detailEntries.length > 0 && (
          <Row
            label="주요 확인 항목"
            value={detailEntries.map(([, v]) => v).join(", ")}
            onEdit={() => onEditStep(2)}
          />
        )}
        <Row label="일정" value={scheduleValue} onEdit={() => onEditStep(3)} />
        <Row label="현재 진행 상황" value={stageLabel} onEdit={() => onEditStep(3)} />
      </div>
    </Card>
  );
}
