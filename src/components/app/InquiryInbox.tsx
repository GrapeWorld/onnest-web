import { Card } from "@/components/ui/Card";
import { InquiryStatusControl } from "@/components/app/InquiryStatusControl";
import { statusClassName } from "@/data/inquiries";
import { prisma } from "@/lib/prisma";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export async function InquiryInbox() {
  const inquiries = await prisma.inquiry.findMany({
    orderBy: { createdAt: "desc" },
  });

  if (inquiries.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="font-semibold text-forest">
          아직 접수된 문의가 없습니다.
        </p>
        <p className="mt-2 text-sm text-ink/60">
          문의 페이지에서 새 문의가 접수되면 이곳에 표시됩니다.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-5">
      {inquiries.map((inquiry) => (
        <Card key={inquiry.id} className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${statusClassName[inquiry.status] ?? "bg-cream text-forest"}`}
                >
                  {inquiry.status}
                </span>
                {inquiry.spaceType && (
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sage ring-1 ring-forest/10">
                    {inquiry.spaceType}
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-xl font-black text-forest">
                {inquiry.name} · {inquiry.type}
              </h2>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-ink/65">
                {inquiry.message}
              </p>
            </div>
            <div className="flex min-w-56 flex-col gap-2 text-sm text-ink/65">
              <InquiryStatusControl
                inquiryId={inquiry.id}
                status={inquiry.status}
              />
              <span>접수: {dateFormatter.format(inquiry.createdAt)}</span>
              <span>담당: {inquiry.owner ?? "미배정"}</span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl bg-cream/70 p-4 text-sm md:grid-cols-4">
            <div>
              <p className="font-bold text-forest">소속</p>
              <p className="mt-1 text-ink/65">{inquiry.organization ?? "-"}</p>
            </div>
            <div>
              <p className="font-bold text-forest">지역</p>
              <p className="mt-1 text-ink/65">{inquiry.region ?? "-"}</p>
            </div>
            <div>
              <p className="font-bold text-forest">이메일</p>
              <p className="mt-1 break-all text-ink/65">{inquiry.email}</p>
            </div>
            <div>
              <p className="font-bold text-forest">연락처</p>
              <p className="mt-1 text-ink/65">{inquiry.phone}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
