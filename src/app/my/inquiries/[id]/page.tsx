import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CustomerAppShell } from "@/components/app/CustomerAppShell";
import { Card } from "@/components/ui/Card";
import { InquiryMessageThread } from "@/components/app/InquiryMessageThread";
import { InquiryMessageForm } from "@/components/app/InquiryMessageForm";
import { InquirySatisfactionForm } from "@/components/app/InquirySatisfactionForm";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusClassName } from "@/data/inquiries";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function MyInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  // 본인 소유가 아니면 존재 자체를 노출하지 않는다.
  const inquiry = await prisma.inquiry.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      type: true,
      region: true,
      spaceType: true,
      message: true,
      status: true,
      nextAction: true,
      privacyAgreedAt: true,
      createdAt: true,
      satisfactionRating: true,
      satisfactionComment: true,
      satisfactionSubmittedAt: true,
      assignee: { select: { name: true } },
    },
  });
  if (!inquiry) notFound();

  const messages = await prisma.inquiryMessage.findMany({
    where: { inquiryId: id },
    orderBy: { createdAt: "asc" },
    select: { id: true, senderRole: true, body: true, senderName: true, createdAt: true },
  });

  const canRate = inquiry.status === "답변 완료" && !inquiry.satisfactionSubmittedAt;

  return (
    <CustomerAppShell title="내 문의" description="문의 진행 상황과 답변을 확인합니다.">
      <Link
        href="/my/inquiries"
        className="mb-6 inline-block text-sm font-semibold text-forest hover:underline"
      >
        ← 내 문의 목록으로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-forest">문의 내용</h2>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[inquiry.status] ?? "bg-cream text-forest"}`}
              >
                {inquiry.status}
              </span>
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-ink/50">문의 유형</dt>
                <dd className="font-semibold text-forest">{inquiry.type}</dd>
              </div>
              <div>
                <dt className="text-ink/50">담당자</dt>
                <dd className="font-semibold text-forest">
                  {inquiry.assignee?.name ?? "배정 전"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">접수일</dt>
                <dd className="font-semibold text-forest">
                  {dateTimeFormatter.format(inquiry.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">다음 액션</dt>
                <dd className="font-semibold text-forest">{inquiry.nextAction ?? "-"}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <p className="text-sm text-ink/50">보내신 문의 내용</p>
              <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-cream px-4 py-3 text-sm leading-7 text-ink/70">
                {inquiry.message}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">대화</h2>
            <div className="mt-4">
              <InquiryMessageThread messages={messages} />
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <h2 className="text-xl font-black text-forest">추가 질문 보내기</h2>
            <div className="mt-4">
              <InquiryMessageForm inquiryId={inquiry.id} />
            </div>
          </Card>

          {canRate && (
            <Card>
              <h2 className="text-xl font-black text-forest">만족도 평가</h2>
              <p className="mt-1 text-sm text-ink/60">답변이 도움이 되었나요?</p>
              <div className="mt-4">
                <InquirySatisfactionForm inquiryId={inquiry.id} />
              </div>
            </Card>
          )}

          {inquiry.satisfactionSubmittedAt && (
            <Card className="bg-cream/40">
              <h2 className="text-xl font-black text-forest">만족도 평가 완료</h2>
              <p className="mt-2 text-sm text-forest">
                {"★".repeat(inquiry.satisfactionRating ?? 0)}
                {"☆".repeat(5 - (inquiry.satisfactionRating ?? 0))}
              </p>
              {inquiry.satisfactionComment && (
                <p className="mt-2 text-sm text-ink/60">{inquiry.satisfactionComment}</p>
              )}
            </Card>
          )}
        </div>
      </div>
    </CustomerAppShell>
  );
}
