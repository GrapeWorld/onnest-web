import { Card } from "@/components/ui/Card";
import { serviceStatusClassName } from "@/data/serviceRequests";
import { formatDate } from "@/lib/dates";
import { isQuoteMutableStatus } from "@/lib/serviceRequestQuotes";
import { getServiceRequestNextAction } from "@/lib/serviceRequestCustomerView";
import { ServiceRequestQuoteOption } from "@/components/app/ServiceRequestQuoteOption";
import { ServiceRequestCancelControl } from "@/components/app/ServiceRequestCancelControl";
import { ServiceCompletionControl } from "@/components/app/ServiceCompletionControl";
import { customerVisibleActivityActions } from "@/data/serviceRequestActivity";

type QuoteItem = {
  id: string;
  title: string;
  description: string | null;
  amount: number;
};

/**
 * 고객 화면에 그대로 보여줄 활동. 호출부(페이지)에서 이미
 * customerVisibleActivityActions로만 걸러서 넘긴다 — 여기서는 문구만
 * 만든다. actorEmail·내부 사용자 ID는 아예 이 타입에 없다.
 */
type CustomerActivityItem = {
  id: string;
  action: string;
  createdAt: Date;
};

type ServiceRequestItem = {
  id: string;
  serviceType: string;
  status: string;
  region: string;
  message: string | null;
  preferredDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  cancelRequestedAt?: Date | null;
  noPartnerNoticeSentAt?: Date | null;
  partnerName?: string | null;
  /** /my처럼 여러 프로젝트가 섞이는 곳에서만 넘긴다. */
  projectName?: string;
  quotes: QuoteItem[];
  selectedQuoteId: string | null;
  activities?: CustomerActivityItem[];
  completionConfirmation?: { outcome: string } | null;
  review?: { rating: number; comment: string | null } | null;
};

const activityActionLabels: Partial<Record<string, string>> = {
  STATUS_CHANGED: "상태 변경",
  QUOTE_ADDED: "새 견적 도착",
  QUOTE_SELECTED: "견적 선택",
  CANCEL_REQUESTED: "취소 요청",
};

export function ServiceRequestList({
  requests,
  emptyMessage = "아직 신청한 서비스가 없습니다.",
}: {
  requests: ServiceRequestItem[];
  emptyMessage?: string;
}) {
  if (requests.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="font-semibold text-forest">{emptyMessage}</p>
        <p className="mt-2 text-sm text-ink/60">
          이사, 입주청소, 인터넷 등 필요한 서비스를 신청하면 이곳에 표시됩니다.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {requests.map((request) => {
        const isTerminal = request.status === "작업 완료" || request.status === "취소";
        const nextAction = getServiceRequestNextAction({
          status: request.status,
          cancelRequestedAt: request.cancelRequestedAt,
          noPartnerNoticeSentAt: request.noPartnerNoticeSentAt,
        });

        return (
          <Card key={request.id} className="min-w-0 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                  serviceStatusClassName[request.status] ?? "bg-cream text-forest"
                }`}
              >
                {request.status}
              </span>
              {request.cancelRequestedAt && (
                <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-700">
                  취소 요청 중
                </span>
              )}
              {!request.cancelRequestedAt && request.noPartnerNoticeSentAt && (
                <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  연결 확인 중
                </span>
              )}
              <span className="min-w-0 break-words text-base font-black text-forest">
                {request.serviceType}
              </span>
              {request.projectName && (
                <span className="min-w-0 break-words text-sm text-ink/55">
                  · {request.projectName}
                </span>
              )}
            </div>

            {nextAction && (
              <p className="mt-2 text-sm font-semibold text-sage">{nextAction}</p>
            )}

            <div className="mt-4 grid gap-2 text-sm text-ink/65 sm:grid-cols-2 lg:grid-cols-4">
              <p className="min-w-0 break-words">
                <span className="font-bold text-forest">담당 업체</span>{" "}
                {request.partnerName ?? "배정 전"}
              </p>
              <p>
                <span className="font-bold text-forest">희망일</span>{" "}
                {request.preferredDate
                  ? formatDate(request.preferredDate)
                  : "미정"}
              </p>
              <p className="min-w-0 break-words">
                <span className="font-bold text-forest">지역</span>{" "}
                {request.region}
              </p>
              <p>
                <span className="font-bold text-forest">최근 변경</span>{" "}
                {formatDate(request.updatedAt)}
              </p>
            </div>

            {request.message && (
              <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-cream/70 p-4 text-sm leading-7 text-ink/70">
                {request.message}
              </p>
            )}

            {request.quotes.length > 0 && (
              <div className="mt-4 rounded-2xl border border-sage/30 bg-sage/5 p-4">
                <p className="text-sm font-bold text-forest">
                  받은 견적 {request.quotes.length}건
                  {!request.selectedQuoteId &&
                    isQuoteMutableStatus(request.status) &&
                    " · 견적을 비교하고 선택해주세요"}
                </p>
                <div className="mt-3 grid gap-2">
                  {request.quotes.map((quote) => (
                    <ServiceRequestQuoteOption
                      key={quote.id}
                      requestId={request.id}
                      quote={quote}
                      selected={quote.id === request.selectedQuoteId}
                      selectable={isQuoteMutableStatus(request.status)}
                    />
                  ))}
                </div>
              </div>
            )}

            {request.activities && request.activities.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-ink/45">최근 진행</p>
                <ul className="mt-2 grid gap-1">
                  {request.activities
                    .filter((a) => customerVisibleActivityActions.includes(a.action as never))
                    .slice(0, 3)
                    .map((activity) => (
                      <li key={activity.id} className="text-xs text-ink/55">
                        {formatDate(activity.createdAt)} ·{" "}
                        {activityActionLabels[activity.action] ?? activity.action}
                      </li>
                    ))}
                </ul>
              </div>
            )}

            {!isTerminal && (
              <div className="mt-4">
                <ServiceRequestCancelControl
                  requestId={request.id}
                  reasonRequired={Boolean(request.partnerName)}
                  alreadyRequested={Boolean(request.cancelRequestedAt)}
                />
              </div>
            )}

            {request.status === "작업 완료" && (
              <ServiceCompletionControl
                requestId={request.id}
                confirmation={
                  request.completionConfirmation
                    ? { outcome: request.completionConfirmation.outcome as "OK" | "ISSUE" }
                    : null
                }
                review={request.review ?? null}
              />
            )}
          </Card>
        );
      })}
    </div>
  );
}
