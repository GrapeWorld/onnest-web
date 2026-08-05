import {
  moderationStatusClassName,
  moderationStatusLabels,
  type ModerationStatus,
} from "@/data/handoverModeration";

const explanations: Record<ModerationStatus, string> = {
  pending: "검수 대기 중입니다. 승인되면 공유 링크가 실제로 열립니다.",
  approved: "검수를 통과했습니다. 공유를 켜면 링크를 바로 열람할 수 있습니다.",
  revision_requested: "관리자가 수정을 요청했습니다. 아래 사유를 확인하고 다시 저장해주세요.",
  hidden: "관리자가 비공개 처리했습니다. 기존 공유 링크는 더 이상 열리지 않습니다.",
};

export function HandoverModerationStatus({
  status,
  reason,
}: {
  status: string;
  reason: string | null;
}) {
  const moderationStatus = status as ModerationStatus;
  const label = moderationStatusLabels[moderationStatus] ?? status;
  const explanation = explanations[moderationStatus];
  const className = moderationStatusClassName[moderationStatus] ?? "bg-cream text-forest";

  return (
    <div className="rounded-[24px] border border-forest/10 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>
          검수 상태: {label}
        </span>
      </div>
      {explanation && <p className="mt-3 text-sm text-ink/65">{explanation}</p>}
      {moderationStatus === "revision_requested" && reason && (
        <p className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm text-forest">
          {reason}
        </p>
      )}
      {moderationStatus === "hidden" && reason && (
        <p className="mt-3 rounded-2xl bg-cream px-4 py-3 text-sm text-forest">
          {reason}
        </p>
      )}
    </div>
  );
}
