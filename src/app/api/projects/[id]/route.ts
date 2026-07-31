import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectSchema } from "@/lib/projectSchema";

export async function PATCH(
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
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { name, spaceType, address, moveInDate, budget } = parsed.data;

  // userId 조건을 걸어 남의 프로젝트는 수정 대상에서 제외한다.
  const result = await prisma.project.updateMany({
    where: { id, userId: user.id },
    data: {
      name,
      spaceType,
      address: address || null,
      moveInDate: moveInDate ? new Date(moveInDate) : null,
      budget: budget || null,
    },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ id });
}

/**
 * 프로젝트 삭제.
 * 단계 상태·체크·일정·인수인계서·서비스 신청은 스키마의 onDelete: Cascade로 함께 지워진다.
 */
export async function DELETE(
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

  const { id } = await params;

  // userId 조건을 걸어 남의 프로젝트는 삭제 대상에서 제외한다.
  const result = await prisma.project.deleteMany({
    where: { id, userId: user.id },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ id });
}
