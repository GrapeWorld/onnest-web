import { AppShell, MetricGrid } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/dates";

export default async function AdminHandoversPage() {
  const handovers = await prisma.handover.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      items: { select: { label: true, note: true } },
      project: {
        select: {
          name: true,
          spaceType: true,
          user: { select: { email: true } },
        },
      },
    },
  });

  const sharedCount = handovers.filter(
    (handover) => handover.visibility === "link",
  ).length;

  return (
    <AppShell
      title="인수인계서 검수"
      description="작성된 인수인계서 내용과 공개 상태를 확인합니다. 금칙 표현은 저장 시 서버에서 1차로 걸러집니다."
    >
      <MetricGrid
        items={[
          ["전체 인수인계서", `${handovers.length}건`],
          ["공유 중", `${sharedCount}건`],
          ["비공개", `${handovers.length - sharedCount}건`],
          [
            "항목 메모",
            `${handovers.reduce((sum, h) => sum + h.items.length, 0)}건`,
          ],
        ]}
      />

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-black text-forest">
          인수인계서 목록{" "}
          <span className="text-base font-bold text-sage">
            {handovers.length}건
          </span>
        </h2>

        {handovers.length === 0 ? (
          <Card className="p-10 text-center">
            <p className="font-semibold text-forest">
              아직 작성된 인수인계서가 없습니다.
            </p>
            <p className="mt-2 text-sm text-ink/60">
              사용자가 프로젝트에서 인수인계서를 작성하면 이곳에 표시됩니다.
            </p>
          </Card>
        ) : (
          <div className="grid gap-5">
            {handovers.map((handover) => (
              <Card key={handover.id} className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      handover.visibility === "link"
                        ? "bg-navy text-white"
                        : "bg-cream text-forest"
                    }`}
                  >
                    {handover.visibility === "link" ? "공유 중" : "비공개"}
                  </span>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-sage ring-1 ring-forest/10">
                    {handover.project.spaceType}
                  </span>
                  <span className="text-sm text-ink/55">
                    수정: {formatDate(handover.updatedAt)}
                  </span>
                </div>

                <h3 className="mt-4 text-lg font-black text-forest">
                  {handover.project.name}
                </h3>
                <p className="mt-1 break-all text-sm text-ink/55">
                  {handover.project.user.email}
                </p>

                <p className="mt-4 whitespace-pre-wrap rounded-2xl bg-cream/70 p-4 text-sm leading-7 text-ink/70">
                  {handover.summary}
                </p>

                {handover.items.length > 0 && (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {handover.items.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl bg-white px-4 py-3 text-sm ring-1 ring-forest/10"
                      >
                        <p className="text-xs font-bold text-sage">
                          {item.label}
                        </p>
                        <p className="mt-1 text-ink/70">{item.note}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
