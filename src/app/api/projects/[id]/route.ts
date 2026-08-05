import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectWizardSchema } from "@/lib/projectWizardSchema";
import { subtypesByCategory, type SpaceCategory } from "@/data/projectSpace";
import { deleteProjectWithDocuments } from "@/lib/projectDeletion";

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
  const parsed = projectWizardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "입력값을 확인해주세요." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const data = parsed.data;

  const spaceTypeLabel =
    subtypesByCategory[data.spaceCategory as SpaceCategory].find(
      (subtype) => subtype.value === data.spaceSubtype,
    )?.label ?? data.spaceSubtype;
  const fullAddress = [data.address, data.addressDetail, data.unitNumber]
    .filter(Boolean)
    .join(" ");

  // userId 조건을 걸어 남의 프로젝트는 수정 대상에서 제외한다.
  const result = await prisma.project.updateMany({
    where: { id, userId: user.id },
    data: {
      name: data.name,
      spaceType: spaceTypeLabel,
      spaceCategory: data.spaceCategory,
      transactionType: data.transactionType,
      address: data.addressPending ? null : fullAddress || null,
      addressPending: data.addressPending,
      moveInDate:
        !data.scheduleUndecided && data.moveInDate
          ? new Date(data.moveInDate)
          : null,
      contractDate:
        !data.scheduleUndecided && data.contractDate
          ? new Date(data.contractDate)
          : null,
      scheduleUndecided: data.scheduleUndecided,
      budget: data.budget || null,
      projectStage: data.projectStage,
      details: data.details,
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
  _request: Request,
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

  const result = await deleteProjectWithDocuments({
    projectId: id,
    userId: user.id,
  });

  switch (result.status) {
    case 404:
      return NextResponse.json(
        { error: "프로젝트를 찾을 수 없습니다." },
        { status: 404 },
      );
    case 503:
      return NextResponse.json(
        { error: "문서 저장소를 확인할 수 없어 프로젝트를 삭제하지 못했습니다." },
        { status: 503 },
      );
    case 502:
      return NextResponse.json(
        {
          error:
            "문서 정리에 실패해 프로젝트를 삭제하지 못했습니다. 다시 시도해주세요.",
        },
        { status: 502 },
      );
    case 200:
      return NextResponse.json({ id: result.id });
  }
}
