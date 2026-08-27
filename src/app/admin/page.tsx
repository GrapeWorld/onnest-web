import Link from "next/link";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";
import { getOpenActionItemSummary } from "@/lib/actionItemQueries";
import { TaskSummaryCard } from "@/components/app/TaskSummaryCard";

const SUPER_ONLY_HREFS = ["/admin/admins", "/admin/exports"];

const sections = [
  {
    href: "/admin/inquiries",
    title: "문의 접수함",
    description:
      "개인 고객, 공간 확인 요청, 제휴 문의를 확인하고 상태를 관리합니다.",
  },
  {
    href: "/admin/service-leads",
    title: "서비스 리드",
    description: "이사, 청소, 인터넷, 보수 파트너 연결 요청을 처리합니다.",
  },
  {
    href: "/admin/users",
    title: "회원 관리",
    description: "가입자와 권한, 프로젝트 보유 현황을 확인합니다.",
  },
  {
    href: "/admin/handovers",
    title: "인수인계서 검수",
    description: "작성된 인수인계서 내용과 공개 상태를 확인합니다.",
  },
  {
    href: "/admin/admins",
    title: "관리자 계정",
    description: "관리자 권한을 부여·변경·회수합니다. (최고관리자 전용)",
  },
  {
    href: "/admin/partners",
    title: "제휴업체 관리",
    description: "이사·청소 등 서비스 신청을 넘길 외주 업체를 등록·관리합니다.",
  },
  {
    href: "/admin/exports",
    title: "데이터 내보내기",
    description: "고객·프로젝트 이용 내역을 Excel로 내려받습니다. (최고관리자 전용)",
  },
];

export default async function AdminPage() {
  const currentAdmin = await getCurrentUser();
  const isSuper = Boolean(currentAdmin && isSuperAdmin(currentAdmin));
  const visibleSections = sections.filter(
    (section) => isSuper || !SUPER_ONLY_HREFS.includes(section.href),
  );

  const [
    userCount,
    projectCount,
    handoverCount,
    newInquiries,
    newRequests,
    recentInquiries,
    recentRequests,
    taskSummary,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.project.count(),
    prisma.handover.count(),
    prisma.inquiry.count({ where: { status: "신규" } }),
    prisma.serviceRequest.count({ where: { status: "신규" } }),
    prisma.inquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.serviceRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        serviceType: true,
        status: true,
        region: true,
        createdAt: true,
      },
    }),
    isSuper && currentAdmin
      ? getOpenActionItemSummary(currentAdmin.id, "ADMIN")
      : Promise.resolve({ count: 0, items: [] }),
  ]);

  return (
    <AppShell
      title="관리자 대시보드"
      description="회원, 프로젝트, 인수인계서, 문의, 서비스 신청 현황을 확인합니다."
    >
      <MetricGrid
        items={[
          ["가입 회원", `${userCount}명`],
          ["전체 프로젝트", `${projectCount}건`],
          ["작성된 인수인계서", `${handoverCount}건`],
          ["처리 대기", `${newInquiries + newRequests}건`],
        ]}
      />

      {isSuper && (
        <div className="mt-6">
          <TaskSummaryCard
            count={taskSummary.count}
            items={taskSummary.items}
            emptyMessage="지금 처리할 업무가 없습니다."
          />
        </div>
      )}

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-black text-forest">운영 화면</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {visibleSections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full p-5">
                <h3 className="text-lg font-black text-forest">
                  {section.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-ink/65">
                  {section.description}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-5 lg:grid-cols-2">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-forest">최근 문의</h2>
            <Link
              href="/admin/inquiries"
              className="text-sm font-semibold text-forest hover:underline"
            >
              전체 보기
            </Link>
          </div>
          {recentInquiries.length === 0 ? (
            <p className="mt-5 text-sm text-ink/55">접수된 문의가 없습니다.</p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {recentInquiries.map((inquiry) => (
                <li
                  key={inquiry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3 text-sm"
                >
                  <span className="min-w-0 break-words font-semibold text-forest">
                    {inquiry.name} · {inquiry.type}
                  </span>
                  <span className="shrink-0 text-ink/55">
                    {inquiry.status} · {formatDate(inquiry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-forest">최근 서비스 신청</h2>
            <Link
              href="/admin/service-leads"
              className="text-sm font-semibold text-forest hover:underline"
            >
              전체 보기
            </Link>
          </div>
          {recentRequests.length === 0 ? (
            <p className="mt-5 text-sm text-ink/55">
              접수된 서비스 신청이 없습니다.
            </p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {recentRequests.map((request) => (
                <li
                  key={request.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-cream px-4 py-3 text-sm"
                >
                  <span className="min-w-0 break-words font-semibold text-forest">
                    {request.serviceType} · {request.region}
                  </span>
                  <span className="shrink-0 text-ink/55">
                    {request.status} · {formatDate(request.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
