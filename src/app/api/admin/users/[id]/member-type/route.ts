import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { memberTypes } from "@/data/memberType";

const updateSchema = z
  .object({
    memberType: z.enum(memberTypes, { error: "회원 구분을 선택해주세요." }),
    partnerId: z.string().min(1).nullable().optional(),
    reason: z.string().trim().min(1, "변경 사유를 입력해주세요.").max(500),
  })
  .superRefine((data, ctx) => {
    if (data.memberType === "PARTNER" && !data.partnerId) {
      ctx.addIssue({
        code: "custom",
        path: ["partnerId"],
        message: "연결할 업체를 선택해주세요.",
      });
    }
  });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getCurrentUser();
  if (!admin || !isSuperAdmin(admin)) {
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
  const { memberType, reason } = parsed.data;
  // CUSTOMER로 바꾸면 partnerId를 무시하지 말고 서버에서 명시적으로 null 처리한다.
  const nextPartnerId = memberType === "PARTNER" ? parsed.data.partnerId! : null;

  let result: {
    error: "notfound-user" | "notfound-partner" | "partner-inactive" | "same" | null;
  };
  try {
    result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id },
        select: { id: true, memberType: true, partnerId: true },
      });
      if (!target) return { error: "notfound-user" as const };

      if (target.memberType === memberType && target.partnerId === nextPartnerId) {
        return { error: "same" as const };
      }

      if (nextPartnerId) {
        const partner = await tx.partner.findUnique({
          where: { id: nextPartnerId },
          select: { id: true, active: true },
        });
        if (!partner) return { error: "notfound-partner" as const };
        // 이 시점에 도달했다는 것은 이전 검사에서 "same"으로 걸러지지 않았다는
        // 뜻이므로, PARTNER 확정은 항상 새 연결이다 — 비활성 업체로의 신규
        // 연결은 차단한다(기존 연결 유지와는 다른 경로).
        if (!partner.active) return { error: "partner-inactive" as const };
      }

      await tx.user.update({
        where: { id },
        data: {
          memberType,
          partnerId: nextPartnerId,
          // 회원 구분 변경 시 기존 세션을 무효화한다 — 지금은 memberType 자체에
          // 딸린 전용 권한이 없지만, 향후 파트너 전용 권한이 생겼을 때도 이
          // 변경이 다음 요청부터 곧바로 반영되도록 미리 대비한다.
          authVersion: { increment: 1 },
        },
      });
      await tx.memberTypeHistory.create({
        data: {
          userId: id,
          fromType: target.memberType,
          toType: memberType,
          fromPartnerId: target.partnerId,
          toPartnerId: nextPartnerId,
          reason,
          actorId: admin.id,
          actorEmail: admin.email,
        },
      });
      return { error: null };
    }, { isolationLevel: "Serializable" });
  } catch {
    return NextResponse.json(
      { error: "다른 요청과 충돌해 처리하지 못했습니다. 다시 시도해주세요." },
      { status: 409 },
    );
  }

  if (result.error === "notfound-user") {
    return NextResponse.json(
      { error: "회원을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "notfound-partner") {
    return NextResponse.json(
      { error: "업체를 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "partner-inactive") {
    return NextResponse.json(
      { error: "연결할 수 없는 업체입니다." },
      { status: 400 },
    );
  }
  if (result.error === "same") {
    return NextResponse.json(
      { error: "이미 같은 회원 구분입니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id, memberType, partnerId: nextPartnerId });
}
