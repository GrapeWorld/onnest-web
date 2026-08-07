import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { PartnerCompanyForm } from "@/components/app/PartnerCompanyForm";
import { requirePartnerOwner } from "@/lib/partnerAuth";
import { prisma } from "@/lib/prisma";

const partnerNav: [string, string][] = [
  ["요청 목록", "/partner"],
  ["팀 관리", "/partner/team"],
  ["업체 정보", "/partner/company"],
];

export default async function PartnerCompanyPage() {
  const { membership } = await requirePartnerOwner();

  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: membership.partnerId },
    select: {
      name: true,
      partnerCode: true,
      serviceType: true,
      contactName: true,
      contactPhone: true,
      companyDescription: true,
    },
  });

  return (
    <AppShell title="업체 정보" description="업체 기본 정보를 관리합니다." navItems={partnerNav}>
      <Link href="/partner" className="mb-6 inline-block text-sm font-semibold text-forest hover:underline">
        ← 요청 목록으로
      </Link>

      <div className="mx-auto max-w-xl">
        <Card>
          <dl className="mb-6 grid gap-3 text-sm">
            <div>
              <dt className="text-ink/50">업체 코드</dt>
              <dd className="font-semibold text-forest">{partner.partnerCode}</dd>
            </div>
            <div>
              <dt className="text-ink/50">서비스 유형</dt>
              <dd className="font-semibold text-forest">{partner.serviceType}</dd>
            </div>
          </dl>
          <p className="mb-4 text-xs text-ink/45">
            서비스 유형은 관리자만 변경할 수 있습니다.
          </p>
          <PartnerCompanyForm
            name={partner.name}
            contactName={partner.contactName}
            contactPhone={partner.contactPhone}
            companyDescription={partner.companyDescription}
          />
        </Card>
      </div>
    </AppShell>
  );
}
