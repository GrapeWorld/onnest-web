import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getSession } from "@/lib/session";
import { checkRateLimit } from "@/lib/rateLimit";
import { createNotification } from "@/lib/notifications";
import { sendEmail, escapeHtml } from "@/lib/email";

/** 소셜 계정 연결 해제. 로그인 방법이 하나도 남지 않는 해제는 막는다. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const limit = await checkRateLimit("oauthLink", user.id);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
      { status: 429 },
    );
  }

  const { id } = await params;
  const target = await prisma.socialAccount.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });
  // 존재하지 않거나 다른 사람 소유면 같은 404로 처리해 소유 여부를 노출하지 않는다.
  if (!target || target.userId !== user.id) {
    return NextResponse.json(
      { error: "연결된 계정을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  const connectedCount = await prisma.socialAccount.count({
    where: { userId: user.id },
  });
  if (!user.passwordHash && connectedCount <= 1) {
    return NextResponse.json(
      {
        error:
          "마지막 남은 로그인 방법은 해제할 수 없습니다. 먼저 비밀번호를 설정하거나 다른 계정을 연결해주세요.",
      },
      { status: 400 },
    );
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.socialAccount.delete({ where: { id } });
    // 로그인 방법이 줄어드는 보안 관련 변경이므로 authVersion을 올려
    // 다른 곳의 기존 세션을 무효화한다. 지금 요청의 세션에도 새 값을 바로
    // 반영해 본인이 스스로 로그아웃되지 않게 한다.
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { authVersion: { increment: 1 } },
      select: { authVersion: true },
    });
    await createNotification(tx, {
      recipientUserId: user.id,
      type: "SOCIAL_ACCOUNT_UNLINKED",
      title: "소셜 계정 연결이 해제되었습니다",
      body: "로그인에 사용하던 소셜 계정 연결이 해제되었습니다. 본인이 요청하지 않았다면 즉시 확인해주세요.",
      internalPath: "/my",
    });
    return updated;
  });

  const session = await getSession();
  session.userId = user.id;
  session.authVersion = updatedUser.authVersion;
  await session.save();

  // 다른 기기의 세션이 무효화되는 보안 변경이라, 그 세션에서는 더 이상
  // 알림함을 볼 수 없을 수 있다 — 이메일로도 반드시 안내한다.
  try {
    await sendEmail({
      to: user.email,
      subject: "[ONNEST] 소셜 계정 연결이 해제되었습니다",
      html: `
        <p>${escapeHtml(user.name)}님, 안녕하세요.</p>
        <p>ONNEST 계정에서 소셜 로그인 연결이 해제되었습니다.</p>
        <p>본인이 요청하지 않은 변경이라면 즉시 비밀번호를 변경하고 운영팀에 문의해주세요.</p>
      `,
    });
  } catch (error) {
    console.error("[email] social account unlink notification failed", error);
  }

  return NextResponse.json({ id });
}
