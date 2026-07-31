import { Card } from "@/components/ui/Card";
import { serviceStatusClassName } from "@/data/serviceRequests";
import { formatDate } from "@/lib/dates";

type ServiceRequestItem = {
  id: string;
  serviceType: string;
  status: string;
  region: string;
  message: string | null;
  preferredDate: Date | null;
  createdAt: Date;
  /** /my처럼 여러 프로젝트가 섞이는 곳에서만 넘긴다. */
  projectName?: string;
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
      {requests.map((request) => (
        <Card key={request.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                serviceStatusClassName[request.status] ?? "bg-cream text-forest"
              }`}
            >
              {request.status}
            </span>
            <span className="text-base font-black text-forest">
              {request.serviceType}
            </span>
            {request.projectName && (
              <span className="text-sm text-ink/55">
                · {request.projectName}
              </span>
            )}
          </div>

          <div className="mt-4 grid gap-2 text-sm text-ink/65 sm:grid-cols-3">
            <p>
              <span className="font-bold text-forest">희망일</span>{" "}
              {request.preferredDate
                ? formatDate(request.preferredDate)
                : "미정"}
            </p>
            <p>
              <span className="font-bold text-forest">지역</span>{" "}
              {request.region}
            </p>
            <p>
              <span className="font-bold text-forest">신청일</span>{" "}
              {formatDate(request.createdAt)}
            </p>
          </div>

          {request.message && (
            <p className="mt-3 whitespace-pre-wrap rounded-2xl bg-cream/70 p-4 text-sm leading-7 text-ink/70">
              {request.message}
            </p>
          )}
        </Card>
      ))}
    </div>
  );
}
