import { InquiryInbox } from "@/components/app/InquiryInbox";
import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { prisma } from "@/lib/prisma";

export default async function AdminInquiriesPage() {
  const [total, newCount, reviewing, assigned] = await Promise.all([
    prisma.inquiry.count(),
    prisma.inquiry.count({ where: { status: "신규" } }),
    prisma.inquiry.count({ where: { status: "검토 중" } }),
    prisma.inquiry.count({ where: { status: "파트너 배정" } }),
  ]);

  return (
    <AppShell
      title="문의 접수함"
      description="개인 고객, 사무실·공장 확인 요청, 제휴 문의를 한곳에서 보고 상태와 다음 액션을 관리합니다."
    >
      <MetricGrid
        items={[
          ["전체 문의", `${total}건`],
          ["신규", `${newCount}건`],
          ["검토 중", `${reviewing}건`],
          ["파트너 배정", `${assigned}건`],
        ]}
      />
      <div className="mt-6">
        <InquiryInbox />
      </div>
    </AppShell>
  );
}
