import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EventForm } from "@/components/app/EventForm";
import { EventList, type EventRow } from "@/components/app/EventList";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  formatDate,
  formatWeekday,
  formatDDay,
  daysUntil,
  toDateInputValue,
} from "@/lib/dates";

export default async function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    include: { events: { orderBy: { date: "asc" } } },
  });
  if (!project) notFound();

  // 날짜 포맷과 D-day는 서버에서 서울 기준으로 계산해 넘긴다.
  const rows: EventRow[] = project.events.map((event) => ({
    id: event.id,
    title: event.title,
    memo: event.memo,
    done: event.done,
    dateLabel: formatDate(event.date),
    dateValue: toDateInputValue(event.date),
    weekday: formatWeekday(event.date),
    dday: formatDDay(event.date),
    past: daysUntil(event.date) < 0,
  }));

  const upcoming = rows.filter((row) => !row.done && !row.past);
  const done = rows.filter((row) => row.done);
  const missed = rows.filter((row) => !row.done && row.past);

  return (
    <AppShell
      title="입주 일정"
      description="계약일, 전입신고, 확정일자, 청소, 이사, 인터넷 설치 일정을 한 화면에 모읍니다."
    >
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <Button href={`/projects/${project.id}`} variant="ghost">
          프로젝트 홈
        </Button>
        <Button href={`/projects/${project.id}/handover`} variant="secondary">
          생활 정보
        </Button>
      </div>

      {project.moveInDate && (
        <Card className="mb-6 bg-cream/60">
          <p className="text-sm text-ink/60">입주 예정일</p>
          <p className="mt-1 text-2xl font-black text-forest">
            {formatDate(project.moveInDate)}{" "}
            <span className="text-base font-bold text-sage">
              {formatDDay(project.moveInDate)}
            </span>
          </p>
        </Card>
      )}

      <EventForm projectId={project.id} />

      <section className="mt-8">
        <h2 className="mb-4 text-xl font-black text-forest">
          다가오는 일정{" "}
          <span className="text-base font-bold text-sage">
            {upcoming.length}건
          </span>
        </h2>
        <EventList projectId={project.id} events={upcoming} />
      </section>

      {missed.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-black text-forest">
            지난 일정{" "}
            <span className="text-base font-bold text-ink/45">
              {missed.length}건
            </span>
          </h2>
          <p className="mb-4 text-sm text-ink/55">
            날짜가 지났지만 아직 완료 표시가 되지 않았습니다.
          </p>
          <EventList projectId={project.id} events={missed} />
        </section>
      )}

      {done.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-4 text-xl font-black text-forest">
            완료{" "}
            <span className="text-base font-bold text-ink/45">
              {done.length}건
            </span>
          </h2>
          <EventList projectId={project.id} events={done} />
        </section>
      )}
    </AppShell>
  );
}
