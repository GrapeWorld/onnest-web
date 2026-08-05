import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { adminRoles } from "@/data/adminRole";

const updateSchema = z.object({
  toRole: z.union([z.enum(adminRoles), z.null()]),
  reason: z.string().trim().min(1, "변경 사유를 입력해주세요.").max(500),
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
  const { toRole, reason } = parsed.data;

  // 관리자 계정 관리 화면에서 자기 자신의 권한은 바꿀 수 없다 —
  // 실수로 스스로를 강등·회수해 화면에서 잠기는 사고를 막기 위함.
  if (id === admin.id) {
    return NextResponse.json(
      { error: "자기 자신의 권한은 변경할 수 없습니다." },
      { status: 400 },
    );
  }

  // 대상 조회, 마지막 super 검사, 권한 변경을 전부 하나의 SERIALIZABLE
  // 트랜잭션 안에서 한다 — 두 요청이 거의 동시에 마지막 두 super를 서로
  // 강등시키면 둘 다 바깥에서 카운트 체크만 통과할 수 있었다. SERIALIZABLE
  // 격리에서는 이런 충돌이 감지되면 한쪽이 자동으로 실패한다.
  let result: {
    error: "notfound" | "same" | "lastsuper" | null;
  };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id },
          select: { id: true, adminRole: true },
        });
        if (!target) return { error: "notfound" as const };
        if (target.adminRole === toRole) return { error: "same" as const };

        // 마지막 최고관리자를 강등·회수하면 아무도 관리자 계정 관리
        // 화면에 접근할 수 없게 된다 — CLI 부트스트랩
        // (scripts/set-admin.mjs)으로만 복구 가능한 상태를 막는다.
        if (target.adminRole === "super" && toRole !== "super") {
          const remainingSuperCount = await tx.user.count({
            where: { adminRole: "super", id: { not: id } },
          });
          if (remainingSuperCount === 0) {
            return { error: "lastsuper" as const };
          }
        }

        await tx.user.update({ where: { id }, data: { adminRole: toRole } });
        await tx.adminRoleHistory.create({
          data: {
            userId: id,
            fromRole: target.adminRole,
            toRole,
            reason,
            actorId: admin.id,
            actorEmail: admin.email,
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
      { error: "회원을 찾을 수 없습니다." },
      { status: 404 },
    );
  }
  if (result.error === "same") {
    return NextResponse.json(
      { error: "이미 같은 권한입니다." },
      { status: 400 },
    );
  }
  if (result.error === "lastsuper") {
    return NextResponse.json(
      { error: "마지막 남은 최고관리자는 권한을 낮추거나 회수할 수 없습니다." },
      { status: 400 },
    );
  }

  return NextResponse.json({ id, adminRole: toRole });
}
