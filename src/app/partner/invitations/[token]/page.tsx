import { redirect } from "next/navigation";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { InvitationAcceptButton } from "@/components/app/InvitationAcceptButton";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hashSecret } from "@/lib/verification";
import { isInvitationUsable } from "@/lib/partnerInvitation";
import { partnerRoleLabels, type PartnerRole } from "@/data/partnerRole";

export default async function PartnerInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/auth/login?returnTo=${encodeURIComponent(`/partner/invitations/${token}`)}`);
  }

  const invitation = await prisma.partnerInvitation.findUnique({
    where: { tokenHash: hashSecret(token) },
    select: {
      role: true,
      expiresAt: true,
      usedAt: true,
      revokedAt: true,
      partner: { select: { name: true } },
    },
  });

  const valid = invitation && isInvitationUsable(invitation);

  return (
    <AppShell title="업체 직원 초대" description="업체 포털 직원으로 합류합니다." showNav={false}>
      <div className="mx-auto max-w-md">
        <Card className="p-10 text-center">
          {!valid ? (
            <p className="font-semibold text-red-700">
              초대 링크가 만료되었거나 이미 사용되었습니다.
            </p>
          ) : (
            <>
              <p className="text-sm text-ink/55">아래 업체의 직원으로 초대받았습니다.</p>
              <p className="mt-2 text-xl font-black text-forest">{invitation.partner.name}</p>
              <p className="mt-1 text-sm text-ink/65">
                역할: {partnerRoleLabels[invitation.role as PartnerRole] ?? invitation.role}
              </p>
              <div className="mt-6">
                <InvitationAcceptButton token={token} />
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
