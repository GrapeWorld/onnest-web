import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getActiveOwnerMembership } from "@/lib/partnerAuth";
import { partnerRoles, partnerMembershipStatuses } from "@/data/partnerRole";

const updateSchema = z
  .object({
    role: z.enum(partnerRoles).optional(),
    status: z.enum(partnerMembershipStatuses).optional(),
  })
  .refine((data) => Boolean(data.role) !== Boolean(data.status), {
    message: "role 또는 status 중 하나만 보내주세요.",
  });

/** 업체 대표 전용 — 팀원의 역할 변경 또는 상태 변경(정지/해제/재활성화). */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ membershipId: string }> },
) {
  const user = await getCurrentUser();
  const ownerMembership = user ? await getActiveOwnerMembership(user) : null;
  if (!user || !ownerMembership) {
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

  const { membershipId } = await params;

  let result: { error: "notfound" | "self-revoke" | "last-owner" | "already-member" | null };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.partnerMembership.findUnique({
          where: { id: membershipId },
          select: { id: true, partnerId: true, userId: true, role: true, status: true },
        });
        if (!target || target.partnerId !== ownerMembership.partnerId) {
          return { error: "notfound" as const };
        }

        const nextRole = parsed.data.role ?? target.role;
        const nextStatus = parsed.data.status ?? target.status;

        // 대표 본인 해제는 항상 막는다 — 회사가 고아가 되지 않도록 다른
        // 사람에게 대표를 먼저 위임해야 한다.
        if (target.id === ownerMembership.id && nextStatus === "REVOKED") {
          return { error: "self-revoke" as const };
        }

        // 이 변경으로 "활성 OWNER"가 아니게 되는데, 남는 활성 OWNER가
        // 하나도 없으면 막는다.
        const losesActiveOwner =
          target.role === "OWNER" &&
          target.status === "ACTIVE" &&
          (nextRole !== "OWNER" || nextStatus !== "ACTIVE");
        if (losesActiveOwner) {
          const otherActiveOwners = await tx.partnerMembership.count({
            where: {
              partnerId: target.partnerId,
              role: "OWNER",
              status: "ACTIVE",
              id: { not: target.id },
            },
          });
          if (otherActiveOwners === 0) {
            return { error: "last-owner" as const };
          }
        }

        // ACTIVE로 (재)활성화하는 경우, 다른 곳에 이미 활성 멤버십이
        // 있으면 안 된다(정지 중에 다른 업체에 합류했을 수 있다).
        if (target.status !== "ACTIVE" && nextStatus === "ACTIVE") {
          const elsewhereActive = await tx.partnerMembership.findFirst({
            where: { userId: target.userId, status: "ACTIVE", id: { not: target.id } },
          });
          if (elsewhereActive) return { error: "already-member" as const };
        }

        await tx.partnerMembership.update({
          where: { id: target.id },
          data: { role: nextRole, status: nextStatus },
        });

        // User.memberType/partnerId(호환용)를 활성 여부에 맞춰 동기화한다.
        // 기존 서비스 요청 라우트들은 멤버십 상태를 모르고 이 값만 보므로,
        // 정지·해제 둘 다 즉시 접근을 막으려면 여기서 같이 지워야 한다.
        if (target.status === "ACTIVE" && nextStatus !== "ACTIVE") {
          await tx.user.update({
            where: { id: target.userId },
            data: { memberType: "CUSTOMER", partnerId: null, authVersion: { increment: 1 } },
          });
        } else if (target.status !== "ACTIVE" && nextStatus === "ACTIVE") {
          await tx.user.update({
            where: { id: target.userId },
            data: {
              memberType: "PARTNER",
              partnerId: target.partnerId,
              authVersion: { increment: 1 },
            },
          });
        }

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
    return NextResponse.json({ error: "팀원을 찾을 수 없습니다." }, { status: 404 });
  }
  if (result.error === "self-revoke") {
    return NextResponse.json(
      { error: "대표 본인을 해제할 수 없습니다. 다른 직원에게 대표를 위임한 뒤 다시 시도해주세요." },
      { status: 400 },
    );
  }
  if (result.error === "last-owner") {
    return NextResponse.json(
      { error: "최소 한 명의 대표가 있어야 합니다." },
      { status: 400 },
    );
  }
  if (result.error === "already-member") {
    return NextResponse.json(
      { error: "이미 다른 업체에 소속돼 있어 재활성화할 수 없습니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id: membershipId, ...parsed.data });
}
