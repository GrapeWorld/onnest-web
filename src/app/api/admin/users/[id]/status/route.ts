import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth";
import { memberStatuses, loginBlockedStatuses, memberStatusLabels } from "@/data/memberStatus";
import { createNotification } from "@/lib/notifications";
import { escapeHtml, sendEmail } from "@/lib/email";

const updateSchema = z.object({
  toStatus: z.enum(memberStatuses, { error: "변경할 상태를 선택해주세요." }),
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
  const { toStatus, reason } = parsed.data;

  // 관리자 계정 관리 화면(권한 변경)과 같은 원칙: 본인 계정의 상태는 이
  // 화면에서 바꿀 수 없다 — 실수로 스스로를 정지시켜 잠기는 사고를 막는다.
  if (id === admin.id) {
    return NextResponse.json(
      { error: "자기 자신의 상태는 변경할 수 없습니다." },
      { status: 400 },
    );
  }

  // 대상 조회, 마지막 활성 super 검사, 상태 변경을 전부 하나의 SERIALIZABLE
  // 트랜잭션 안에서 한다 — 두 요청이 거의 동시에 마지막 두 활성 super를
  // 각각 정지시키려 하면 둘 다 바깥에서 카운트 체크만 통과할 수 있었다.
  // SERIALIZABLE 격리에서는 이런 충돌이 감지되면 한쪽이 자동으로 실패한다.
  let result: {
    error: "notfound" | "same" | "lastsuper" | null;
    target?: { email: string; name: string };
  };
  try {
    result = await prisma.$transaction(
      async (tx) => {
        const target = await tx.user.findUnique({
          where: { id },
          select: { id: true, status: true, adminRole: true, email: true, name: true },
        });
        if (!target) return { error: "notfound" as const };
        if (target.status === toStatus) return { error: "same" as const };

        // 로그인을 막는 상태로 바꾸려는 대상이 마지막 남은 활성
        // 최고관리자라면 막는다 — 그러면 아무도 로그인해 되돌릴 수 없는
        // 상태가 되기 때문이다.
        if (
          target.adminRole === "super" &&
          loginBlockedStatuses.includes(toStatus)
        ) {
          const remainingActiveSuperCount = await tx.user.count({
            where: {
              adminRole: "super",
              id: { not: id },
              status: { notIn: loginBlockedStatuses },
            },
          });
          if (remainingActiveSuperCount === 0) {
            return { error: "lastsuper" as const };
          }
        }

        // 상태가 바뀌면 이미 로그인된 세션도 즉시 무효화한다 — authVersion을
        // 올리지 않으면 이 시점 이전에 발급된 세션은 계속 유효해, 정지·탈퇴
        // 처리해도 이미 로그인한 사용자는 로그아웃될 때까지 계속 접근할 수
        // 있었다(passwordReset과 같은 원칙).
        await tx.user.update({
          where: { id },
          data: { status: toStatus, authVersion: { increment: 1 } },
        });
        await tx.memberStatusHistory.create({
          data: {
            userId: id,
            fromStatus: target.status,
            toStatus,
            reason,
            adminId: admin.id,
            adminEmail: admin.email,
          },
        });
        await createNotification(tx, {
          recipientUserId: id,
          type: "MEMBER_STATUS_CHANGED",
          title: "회원 상태가 변경되었습니다",
          body: `회원 상태가 "${memberStatusLabels[toStatus]}"(으)로 변경되었습니다.`,
          internalPath: "/my",
          // 같은 상태로의 재시도는 위 "same" 분기가 먼저 막으므로 dedupeKey가
          // 없어도 안전하다 — 서로 다른 전환은 매번 새 소식이라 남겨야 한다.
        });
        return { error: null, target };
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
      { error: "이미 같은 상태입니다." },
      { status: 400 },
    );
  }
  if (result.error === "lastsuper") {
    return NextResponse.json(
      { error: "마지막 남은 활성 최고관리자는 이용을 제한할 수 없습니다." },
      { status: 400 },
    );
  }

  // 로그인 자체가 막히는 상태로 바뀌면 인앱 알림함을 볼 수 없을 수 있으니
  // 이메일로도 반드시 안내한다. 발송 실패는 이미 커밋된 상태 변경을 막지 않는다.
  if (loginBlockedStatuses.includes(toStatus) && result.target) {
    try {
      await sendEmail({
        to: result.target.email,
        subject: "[ONNEST] 회원 상태가 변경되었습니다",
        html: `
          <p>안녕하세요, ${escapeHtml(result.target.name)}님.</p>
          <p>회원 상태가 "${escapeHtml(memberStatusLabels[toStatus])}"(으)로 변경되었습니다.</p>
          <p>문의사항이 있으시면 고객센터로 연락해주세요.</p>
        `,
      });
    } catch (error) {
      console.error("[email] member status notification failed", error);
    }
  }

  return NextResponse.json({ id, status: toStatus });
}
