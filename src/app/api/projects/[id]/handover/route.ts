import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { handoverSchema } from "@/lib/handoverSchema";
import { findContentIssues, describeIssues } from "@/lib/handoverContent";

/** 인수인계서 저장 (프로젝트당 1개, 없으면 생성 있으면 갱신) */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = handoverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { summary, items } = parsed.data;
  const filled = items.filter((item) => item.note.length > 0);

  // 본문과 항목 메모를 모두 검사한다. 클라이언트를 우회한 호출도 여기서 걸린다.
  const issues = findContentIssues(
    [summary, ...filled.map((item) => item.note)].join("\n"),
  );
  if (issues.length > 0) {
    return NextResponse.json(
      { error: describeIssues(issues) },
      { status: 400 },
    );
  }

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, userId: user.id },
    select: { id: true },
  });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  // 항목은 통째로 교체한다. 부분 갱신보다 상태가 단순하다.
  // 내용을 수정하면 검수 상태를 "검토 대기"로 되돌린다 — 이전 검수 결과는
  // 새 내용을 반영하지 못하므로 다시 검토가 필요하다. 새로 만드는
  // 인수인계서는 컬럼 기본값(pending)을 그대로 쓰면 되므로 손대지 않는다.
  const handover = await prisma.handover.upsert({
    where: { projectId: id },
    create: {
      projectId: id,
      summary,
      items: { create: filled },
    },
    update: {
      summary,
      items: { deleteMany: {}, create: filled },
      moderationStatus: "pending",
      moderationReason: null,
      moderatedAt: null,
      moderatorId: null,
      moderatorEmail: null,
    },
    select: { id: true },
  });

  return NextResponse.json({ id: handover.id });
}
