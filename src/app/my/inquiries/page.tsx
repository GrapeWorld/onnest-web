import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { InquiryLinkRequestButton } from "@/components/app/InquiryLinkRequestButton";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusClassName } from "@/data/inquiries";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export default async function MyInquiriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const [inquiries, candidates] = await Promise.all([
    prisma.inquiry.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        message: true,
        createdAt: true,
        assignee: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    }),
    // 이메일이 같지만 아직 연결되지 않은 비회원 문의 후보.
    prisma.inquiry.findMany({
      where: { email: user.email, userId: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, type: true, createdAt: true },
    }),
  ]);

  return (
    <AppShell title="내 문의" description="보낸 문의의 진행 상황과 답변을 확인합니다.">
      <Link href="/my" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 마이페이지로
      </Link>

      {candidates.length > 0 && (
        <Card className="mb-6 border border-dashed border-forest/20 bg-cream/40">
          <h2 className="text-sm font-bold text-forest">
            이메일이 일치하는 미연결 문의 {candidates.length}건이 있습니다
          </h2>
          <p className="mt-1 text-xs text-ink/55">
            로그인 전에 보낸 문의로 보입니다. 연결하면 이메일로 확인 링크를 보내드려요.
          </p>
          <ul className="mt-3 grid gap-2">
            {candidates.map((candidate) => (
              <li
                key={candidate.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white px-4 py-3 text-sm"
              >
                <span className="text-ink/70">
                  {candidate.type} · {dateFormatter.format(candidate.createdAt)}
                </span>
                <InquiryLinkRequestButton inquiryId={candidate.id} />
              </li>
            ))}
          </ul>
        </Card>
      )}

      {inquiries.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">보낸 문의가 없습니다.</p>
          <p className="mt-2 text-sm text-ink/60">
            궁금한 점이 있다면{" "}
            <Link href="/contact" className="font-semibold text-forest hover:underline">
              문의하기
            </Link>
            에서 남겨주세요.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inquiries.map((inquiry) => (
            <Link key={inquiry.id} href={`/my/inquiries/${inquiry.id}`}>
              <Card className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[inquiry.status] ?? "bg-cream text-forest"}`}
                  >
                    {inquiry.status}
                  </span>
                  <span className="text-xs font-semibold text-ink/50">{inquiry.type}</span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-ink/70">{inquiry.message}</p>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-ink/50">
                  <span>담당자: {inquiry.assignee?.name ?? "배정 전"}</span>
                  <span>
                    {dateFormatter.format(inquiry.createdAt)} · 메시지 {inquiry._count.messages}건
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
