import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { PartnerInviteForm } from "@/components/app/PartnerInviteForm";
import { PartnerMemberRow } from "@/components/app/PartnerMemberRow";
import { PartnerInvitationRow } from "@/components/app/PartnerInvitationRow";
import { requirePartnerOwner } from "@/lib/partnerAuth";
import { prisma } from "@/lib/prisma";
import { isInvitationUsable } from "@/lib/partnerInvitation";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

const partnerNav: [string, string][] = [
  ["요청 목록", "/partner"],
  ["팀 관리", "/partner/team"],
  ["업체 정보", "/partner/company"],
];

export default async function PartnerTeamPage() {
  const { membership: ownerMembership } = await requirePartnerOwner();

  const [members, invitations] = await Promise.all([
    prisma.partnerMembership.findMany({
      where: { partnerId: ownerMembership.partnerId },
      orderBy: { joinedAt: "asc" },
      include: { user: { select: { id: true, name: true, email: true, lastLoginAt: true } } },
    }),
    prisma.partnerInvitation.findMany({
      where: { partnerId: ownerMembership.partnerId, usedAt: null, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, role: true, expiresAt: true, createdAt: true },
    }),
  ]);

  const pendingInvitations = invitations.filter((invitation) =>
    isInvitationUsable({ usedAt: null, revokedAt: null, expiresAt: invitation.expiresAt }),
  );

  return (
    <AppShell title="팀 관리" description="직원을 초대하고 역할을 관리합니다." navItems={partnerNav}>
      <Link href="/partner" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 요청 목록으로
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <Card>
          <h2 className="text-xl font-black text-forest">현재 팀원</h2>
          <div className="mt-4 grid gap-3">
            {members.map((member) => (
              <PartnerMemberRow
                key={member.id}
                membershipId={member.id}
                name={member.user.name}
                email={member.user.email}
                role={member.role}
                status={member.status}
                lastLoginAt={member.user.lastLoginAt?.toISOString() ?? null}
                isSelf={member.id === ownerMembership.id}
              />
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card>
            <h2 className="text-xl font-black text-forest">직원 초대</h2>
            <p className="mt-1 text-sm text-ink/55">
              이메일로 초대 링크를 보냅니다. 링크는 72시간 동안 유효합니다.
            </p>
            <div className="mt-4">
              <PartnerInviteForm />
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-black text-forest">대기 중인 초대</h2>
            {pendingInvitations.length === 0 ? (
              <p className="mt-3 text-sm text-ink/55">대기 중인 초대가 없습니다.</p>
            ) : (
              <ul className="mt-4 grid gap-2">
                {pendingInvitations.map((invitation) => (
                  <PartnerInvitationRow
                    key={invitation.id}
                    invitationId={invitation.id}
                    email={invitation.email}
                    role={invitation.role}
                    sentAt={dateTimeFormatter.format(invitation.createdAt)}
                    expiresAt={dateTimeFormatter.format(invitation.expiresAt)}
                  />
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
