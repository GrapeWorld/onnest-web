import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getProjectStep, stepStatuses } from "@/data/projectSteps";

const bodySchema = z.object({ status: z.enum(stepStatuses) });

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

  if (!getProjectStep(slug)) {
    return NextResponse.json(
      { error: "존재하지 않는 단계입니다." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "올바른 상태값이 아닙니다." },
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

  const { status } = parsed.data;
  await prisma.projectStepState.upsert({
    where: { projectId_slug: { projectId: id, slug } },
    create: { projectId: id, slug, status },
    update: { status },
  });

  return NextResponse.json({ slug, status });
}
