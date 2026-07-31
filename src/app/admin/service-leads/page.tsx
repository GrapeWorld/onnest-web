import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { ServiceRequestStatusControl } from "@/components/app/ServiceRequestStatusControl";
import {
  serviceRequestStatuses,
  serviceStatusClassName,
} from "@/data/serviceRequests";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

const receivedFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function AdminServiceLeadsPage() {
  const requests = await prisma.serviceRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      project: {
        select: {
          name: true,
          spaceType: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  const countByStatus = serviceRequestStatuses.map(
    (status): [string, string] => [
      status,
      `${requests.filter((request) => request.status === status).length}건`,
    ],
  );

  return (
    <AppShell
      title="서비스 리드 관리"
      description="이사, 청소, 인터넷, 보수, 인테리어 파트너 연결 요청의 처리 상태를 확인합니다."
    >
      <MetricGrid items={countByStatus} />

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-black text-forest">
          신청 목록{" "}
          <span className="text-base font-bold text-sage">
            {requests.length}건
          </span>
        </h2>

        {requests.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold text-forest">
              아직 접수된 서비스 신청이 없습니다.
            </p>
            <p className="mt-2 text-sm text-ink/60">
              사용자가 프로젝트에서 서비스를 신청하면 이곳에 표시됩니다.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5">
            {requests.map((request) => (
              <Card key={request.id} className="p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          serviceStatusClassName[request.status] ??
                          "bg-cream text-forest"
                        }`}
                      >
                        {request.status}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sage ring-1 ring-forest/10">
                        {request.project.spaceType}
                      </span>
                    </div>
                    <h3 className="mt-4 text-xl font-black text-forest">
                      {request.serviceType}
                    </h3>
                    <p className="mt-1 text-sm text-ink/60">
                      {request.project.name}
                    </p>
                    {request.message && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/65">
                        {request.message}
                      </p>
                    )}
                  </div>

                  <div className="flex min-w-56 flex-col gap-2 text-sm text-ink/65">
                    <ServiceRequestStatusControl
                      requestId={request.id}
                      status={request.status}
                    />
                    <span>
                      접수: {receivedFormatter.format(request.createdAt)}
                    </span>
                    <span>담당: {request.owner ?? "미배정"}</span>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 rounded-2xl bg-cream/70 p-4 text-sm md:grid-cols-4">
                  <div>
                    <p className="font-bold text-forest">희망일</p>
                    <p className="mt-1 text-ink/65">
                      {request.preferredDate
                        ? formatDate(request.preferredDate)
                        : "미정"}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-forest">지역</p>
                    <p className="mt-1 text-ink/65">{request.region}</p>
                  </div>
                  <div>
                    <p className="font-bold text-forest">연락처</p>
                    <p className="mt-1 text-ink/65">
                      {request.contactName} · {request.contactPhone}
                    </p>
                  </div>
                  <div>
                    <p className="font-bold text-forest">신청 계정</p>
                    <p className="mt-1 break-all text-ink/65">
                      {request.project.user.email}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
