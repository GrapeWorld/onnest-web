import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { Card } from "@/components/ui/Card";
import { PartnerForm } from "@/components/app/PartnerForm";
import { PartnerActiveToggle } from "@/components/app/PartnerActiveToggle";
import { PartnerEditForm } from "@/components/app/PartnerEditForm";
import { ViewerReadOnlyNotice } from "@/components/app/ViewerReadOnlyNotice";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { serviceTypes } from "@/data/serviceRequests";

export default async function AdminPartnersPage() {
  // 조회는 super/viewer 모두 가능 — /admin/layout.tsx의 requireAdmin()이 이미
  // 게이트한다. 생성·수정·비활성화 UI는 super에게만 보여준다(API도 이미
  // super 전용이지만, 화면 권한과 API 권한을 일치시킨다).
  const currentAdmin = await getCurrentUser();
  const canEdit = Boolean(currentAdmin && isSuperAdmin(currentAdmin));

  const partners = await prisma.partner.findMany({
    orderBy: [{ serviceType: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      serviceType: true,
      contactName: true,
      contactPhone: true,
      adminMemo: true,
      active: true,
      _count: { select: { requests: true } },
    },
  });

  return (
    <AppShell
      title="제휴업체 관리"
      description="이사·청소 등 서비스 신청을 넘길 외주 업체를 등록하고 관리합니다."
    >
      <Card className="mb-8">
        <h2 className="mb-4 text-lg font-black text-forest">업체 추가</h2>
        {canEdit ? (
          <PartnerForm />
        ) : (
          <ViewerReadOnlyNotice>
            조회전용 관리자는 업체를 추가·수정할 수 없습니다.
          </ViewerReadOnlyNotice>
        )}
      </Card>

      {serviceTypes.map((type) => {
        const group = partners.filter((partner) => partner.serviceType === type);
        if (group.length === 0) return null;

        return (
          <section key={type} className="mb-8">
            <h2 className="mb-4 text-xl font-black text-forest">{type}</h2>
            <div className="grid gap-4">
              {group.map((partner) => (
                <Card key={partner.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            partner.active
                              ? "bg-mint text-forest"
                              : "bg-ink/15 text-ink/60"
                          }`}
                        >
                          {partner.active ? "활성" : "비활성"}
                        </span>
                      </div>
                      {canEdit ? (
                        <PartnerEditForm
                          partnerId={partner.id}
                          name={partner.name}
                          serviceType={partner.serviceType}
                          contactName={partner.contactName}
                          contactPhone={partner.contactPhone}
                          adminMemo={partner.adminMemo}
                          assignedCount={partner._count.requests}
                        />
                      ) : (
                        <div>
                          <p className="font-semibold text-forest">{partner.name}</p>
                          <p className="mt-1 text-sm text-ink/60">
                            {partner.contactName ?? "담당자 미등록"}
                            {partner.contactPhone && ` · ${partner.contactPhone}`}
                          </p>
                          {partner.adminMemo && (
                            <p className="mt-1 text-xs text-ink/50">{partner.adminMemo}</p>
                          )}
                        </div>
                      )}
                      <Link
                        href={`/admin/service-leads?partnerId=${partner.id}`}
                        className="mt-1 inline-block text-xs text-ink/45 hover:text-forest hover:underline"
                      >
                        배정된 신청 {partner._count.requests}건
                      </Link>
                    </div>
                    {canEdit && (
                      <PartnerActiveToggle partnerId={partner.id} active={partner.active} />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })}

      {partners.length === 0 && (
        <Card className="p-10 text-center">
          <p className="font-semibold text-forest">등록된 업체가 없습니다.</p>
        </Card>
      )}
    </AppShell>
  );
}
