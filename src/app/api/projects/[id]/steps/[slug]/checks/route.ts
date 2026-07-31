import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectStep } from "@/data/projectSteps";

const bodySchema = z.object({ label: z.string(), checked: z.boolean() });

/** 단계 안의 체크리스트 항목 하나를 켜고 끈다. */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string; slug: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "로그인이 필요합니다." },
      { status: 401 },
    );
  }

  const { id, slug } = await params;
  const step = getProjectStep(slug);
  if (!step) {
    return NextResponse.json(
      { error: "존재하지 않는 단계입니다." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  // label은 해당 단계에 실제로 있는 항목이어야 한다. 임의 문자열 저장을 막는다.
  if (!parsed.success || !step.checklist.includes(parsed.data.label)) {
    return NextResponse.json(
      { error: "잘못된 체크 항목입니다." },
      { status: 400 },
    );
  }

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

  const { label, checked } = parsed.data;
  await prisma.projectCheckItem.upsert({
    where: {
      projectId_stepSlug_label: { projectId: id, stepSlug: slug, label },
    },
    create: { projectId: id, stepSlug: slug, label, checked },
    update: { checked },
  });

  return NextResponse.json({ label, checked });
}
