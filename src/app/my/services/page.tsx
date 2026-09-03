import { redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { ServiceRequestList } from "@/components/app/ServiceRequestList";
import { customerVisibleActivityActions } from "@/data/serviceRequestActivity";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** 고객 앱 내비게이션의 "서비스" 탭 목적지. /my에 인라인으로 있던 서비스 신청 목록과 같은 조회를 쓴다. */
export default async function MyServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const requests = await prisma.serviceRequest.findMany({
    where: { project: { userId: user.id } },
    orderBy: { createdAt: "desc" },
    include: {
      project: { select: { name: true } },
      quotes: { orderBy: { createdAt: "asc" } },
      partner: { select: { name: true } },
      completionConfirmation: { select: { outcome: true } },
      review: { select: { rating: true, comment: true } },
      activities: {
        where: { action: { in: customerVisibleActivityActions } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { id: true, action: true, createdAt: true },
      },
    },
  });

  return (
    <CustomerAppShell
      title="서비스 신청 내역"
      description="신청한 서비스, 받은 견적, 진행 상태를 프로젝트와 함께 확인합니다."
    >
      <ServiceRequestList
        requests={requests.map((request) => ({
          ...request,
          projectName: request.project.name,
          partnerName: request.partner?.name ?? null,
        }))}
        emptyMessage="아직 신청한 서비스가 없습니다."
      />
    </CustomerAppShell>
  );
}
