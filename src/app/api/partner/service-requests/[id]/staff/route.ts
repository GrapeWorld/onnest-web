import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { isPartnerStaff } from "@/lib/partnerAuth";

const updateSchema = z.object({
  partnerStaffId: z.string().min(1).nullable(),
});

/** 업체 포털 — 배정된 요청의 담당 직원 지정/해제. 같은 업체 소속 ACTIVE 직원만 지정 가능. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user || !isPartnerStaff(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { partnerStaffId } = parsed.data;

  let result: { error: "notfound" | "notfound-staff" | "staff-blocked" | "same" | null };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.serviceRequest.findUnique({
          where: { id },
          select: { id: true, partnerId: true, partnerStaffId: true },
        });
        if (!existing || existing.partnerId !== user.partnerId) {
          return { error: "notfound" as const };
        }
        if (existing.partnerStaffId === partnerStaffId) {
          return { error: "same" as const };
        }

        let staffName: string | null = null;
        if (partnerStaffId !== null) {
          const target = await tx.user.findUnique({
            where: { id: partnerStaffId },
            select: { id: true, name: true, partnerId: true, memberType: true, status: true },
          });
          // 다른 업체 소속이거나 아예 없는 계정은 같은 404로 처리한다
          // (다른 업체 직원 명단이 존재한다는 사실조차 노출하지 않는다).
          if (!target || target.partnerId !== user.partnerId || target.memberType !== "PARTNER") {
            return { error: "notfound-staff" as const };
          }
          if (target.status !== "ACTIVE") {
            return { error: "staff-blocked" as const };
          }
          staffName = target.name;
        }

        await tx.serviceRequest.update({ where: { id }, data: { partnerStaffId } });
        await tx.serviceRequestActivity.create({
          data: {
            serviceRequestId: id,
            action: partnerStaffId === null ? "STAFF_UNASSIGNED" : "STAFF_ASSIGNED",
            changes: {
              fromStaffId: existing.partnerStaffId,
              toStaffId: partnerStaffId,
              toStaffName: staffName,
            },
            actorId: user.id,
            actorEmail: user.email,
            actorName: user.name,
            actorRole: "PARTNER",
          },
        });
        return { error: null };
      },
      { isolationLevel: "Serializable" },
    );
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound") {
    return NextResponse.json(
      { error: "요청을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "notfound-staff") {
    return NextResponse.json(
      { error: "직원을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "staff-blocked") {
    return NextResponse.json(
      { error: "활성 상태(ACTIVE)의 직원만 담당자로 지정할 수 있습니다." },
      { status: 400 },
    );
  }
  if (result.error === "same") {
    return NextResponse.json(
      { error: "이미 같은 담당자입니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id, partnerStaffId });
}
