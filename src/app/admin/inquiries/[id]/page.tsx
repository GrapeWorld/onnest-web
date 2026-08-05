import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { InquiryAssigneeForm } from "@/components/app/InquiryAssigneeForm";
import { InquiryNoteForm } from "@/components/app/InquiryNoteForm";
import { InquiryContactLogForm } from "@/components/app/InquiryContactLogForm";
import { InquiryMessageThread } from "@/components/app/InquiryMessageThread";
import { AdminInquiryReplyForm } from "@/components/app/AdminInquiryReplyForm";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { statusClassName } from "@/data/inquiries";
import {
  inquiryActivityActionLabels,
  SYSTEM_MIGRATION_ACTOR,
  type InquiryActivityAction,
} from "@/data/inquiryActivity";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

type ActivityRow = {
  id: string;
  action: string;
  changes: unknown;
  snapshot: unknown;
  note: string | null;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  createdAt: Date;
};

function activityBody(entry: ActivityRow) {
  const changes = (entry.changes ?? {}) as Record<string, string | null>;

  switch (entry.action as InquiryActivityAction) {
    case "CREATED":
      return "문의가 접수되었습니다.";
    case "ASSIGNED":
      return `담당자가 지정되었습니다: ${changes.toAssigneeName ?? "알 수 없음"} (${changes.toAssigneeEmail ?? "-"})`;
    case "UNASSIGNED":
      return "담당자가 해제되었습니다.";
    case "STATUS_CHANGED":
      return `${changes.from ?? "-"} → ${changes.to ?? "-"}`;
    case "NEXT_ACTION_CHANGED":
      return `다음 액션: ${changes.from || "(없음)"} → ${changes.to || "(없음)"}`;
    case "NOTE_ADDED":
      return entry.note ?? "";
    case "CONTACT_LOGGED":
      return `[${changes.method ?? "-"}] ${changes.result ?? ""}${
        changes.contactedAt
          ? ` · ${dateTimeFormatter.format(new Date(changes.contactedAt))}`
          : ""
      }${changes.followUp ? ` · 후속조치: ${changes.followUp}` : ""}`;
    default:
      return entry.action;
  }
}

function activityActor(entry: ActivityRow) {
  if (entry.actorEmail === SYSTEM_MIGRATION_ACTOR) return "시스템 (데이터 마이그레이션)";
  if (!entry.actorId) return "시스템 (공개 접수)";
  return `${entry.actorName ?? ""} (${entry.actorEmail ?? ""})`;
}

export default async function AdminInquiryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      organization: true,
      email: true,
      phone: true,
      type: true,
      region: true,
      spaceType: true,
      message: true,
      status: true,
      assigneeId: true,
      assignee: { select: { id: true, name: true, email: true } },
      nextAction: true,
      privacyAgreedAt: true,
      createdAt: true,
      user: { select: { id: true, email: true } },
    },
  });
  if (!inquiry) notFound();

  const [activities, admins, messages] = await Promise.all([
    prisma.inquiryActivity.findMany({
      where: { inquiryId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({
      where: { adminRole: { not: null }, status: "ACTIVE" },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.inquiryMessage.findMany({
      where: { inquiryId: id },
      orderBy: { createdAt: "asc" },
      select: { id: true, senderRole: true, body: true, senderName: true, createdAt: true },
    }),
  ]);

  return (
    <AppShell
      title={inquiry.name}
      description="문의 상세 정보와 담당자·처리 이력을 관리합니다."
    >
      <Link
        href="/admin/inquiries"
        className="mb-6 inline-block text-sm font-semibold text-forest hover:underline"
      >
        ← 문의 접수함으로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-black text-forest">문의 정보</h2>
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
                <dt className="text-ink/50">소속</dt>
                <dd className="font-semibold text-forest">{inquiry.organization ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">이메일</dt>
                <dd className="break-all font-semibold text-forest">{inquiry.email}</dd>
              </div>
              <div>
                <dt className="text-ink/50">연락처</dt>
                <dd className="font-semibold text-forest">{inquiry.phone}</dd>
              </div>
              <div>
                <dt className="text-ink/50">지역</dt>
                <dd className="font-semibold text-forest">{inquiry.region ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">공간 유형</dt>
                <dd className="font-semibold text-forest">{inquiry.spaceType ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">현재 담당자</dt>
                <dd className="font-semibold text-forest">
                  {inquiry.assignee
                    ? `${inquiry.assignee.name} (${inquiry.assignee.email})`
                    : "미배정"}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">다음 액션</dt>
                <dd className="font-semibold text-forest">{inquiry.nextAction ?? "-"}</dd>
              </div>
              <div>
                <dt className="text-ink/50">개인정보 동의</dt>
                <dd className="font-semibold text-forest">
                  {dateTimeFormatter.format(inquiry.privacyAgreedAt)}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">접수일</dt>
                <dd className="font-semibold text-forest">
                  {dateTimeFormatter.format(inquiry.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-ink/50">연결된 회원 계정</dt>
                <dd className="font-semibold text-forest">{inquiry.user?.email ?? "미연결"}</dd>
              </div>
            </dl>
            <div className="mt-4">
              <p className="text-sm text-ink/50">문의 내용</p>
              <p className="mt-1 whitespace-pre-wrap rounded-2xl bg-cream px-4 py-3 text-sm leading-7 text-ink/70">
                {inquiry.message}
              </p>
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">고객과의 대화</h2>
            <p className="mt-1 text-sm text-ink/55">
              고객에게도 그대로 보이는 대화입니다 — 내부 메모와는 별개입니다.
            </p>
            <div className="mt-4">
              <InquiryMessageThread messages={messages} />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">처리 이력</h2>
            {activities.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">아직 활동 기록이 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {activities.map((entry) => (
                  <li key={entry.id} className="rounded-2xl bg-cream px-4 py-3 text-sm">
                    <p className="font-semibold text-forest">
                      {inquiryActivityActionLabels[entry.action as InquiryActivityAction] ??
                        entry.action}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-ink/70">
                      {activityBody(entry)}
                    </p>
                    <p className="mt-1 text-xs text-ink/50">
                      {activityActor(entry)} · {dateTimeFormatter.format(entry.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="grid gap-6">
          <Card>
            <h2 className="text-xl font-black text-forest">상태·담당자·다음 액션</h2>
            <div className="mt-4">
              {canEdit && currentAdmin ? (
                <InquiryAssigneeForm
                  inquiryId={inquiry.id}
                  status={inquiry.status}
                  assigneeId={inquiry.assigneeId}
                  nextAction={inquiry.nextAction}
                  currentAdminId={currentAdmin.id}
                  admins={admins}
                />
              ) : (
                <ViewerReadOnlyNotice>
                  조회전용 관리자는 상태·담당자·다음 액션을 변경할 수 없습니다.
                </ViewerReadOnlyNotice>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">고객에게 답변하기</h2>
            <p className="mt-1 text-sm text-ink/55">
              여기 남긴 내용은 고객에게 이메일로도 알림이 갑니다.
            </p>
            <div className="mt-4">
              {canEdit ? (
                <AdminInquiryReplyForm inquiryId={inquiry.id} />
              ) : (
                <ViewerReadOnlyNotice>
                  조회전용 관리자는 고객에게 답변을 보낼 수 없습니다.
                </ViewerReadOnlyNotice>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">내부 메모</h2>
            <div className="mt-4">
              {canEdit ? (
                <InquiryNoteForm inquiryId={inquiry.id} />
              ) : (
                <ViewerReadOnlyNotice>
                  조회전용 관리자는 메모를 작성할 수 없습니다.
                </ViewerReadOnlyNotice>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">연락 기록</h2>
            <div className="mt-4">
              {canEdit ? (
                <InquiryContactLogForm inquiryId={inquiry.id} />
              ) : (
                <ViewerReadOnlyNotice>
                  조회전용 관리자는 연락 기록을 남길 수 없습니다.
                </ViewerReadOnlyNotice>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
