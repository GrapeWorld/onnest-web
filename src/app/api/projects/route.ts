import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { projectWizardSchema } from "@/lib/projectWizardSchema";
import {
  subtypesByCategory,
  projectStageMeta,
  type SpaceCategory,
  type ProjectStage,
} from "@/data/projectSpace";

export async function POST(request: Request) {
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

  const data = parsed.data;
  // 세부유형의 한글 라벨을 spaceType에 저장한다 — 기존 화면들이 이 컬럼을
  // 그대로 표시용 문자열로 쓰고 있어(프로젝트 상세, 마이페이지 카드,
  // 관리자 화면 등) 값의 "의미"만 4종 고정값에서 세부유형 라벨로 바뀐다.
  const spaceTypeLabel =
    subtypesByCategory[data.spaceCategory as SpaceCategory].find(
      (subtype) => subtype.value === data.spaceSubtype,
    )?.label ?? data.spaceSubtype;

  // 기존 Project.address는 단일 문자열이라, 상세주소·동호수는 합쳐서 저장한다
  // (기존 표시 코드가 project.address 하나만 그대로 보여준다).
  const fullAddress = [data.address, data.addressDetail, data.unitNumber]
    .filter(Boolean)
    .join(" ");

  // 선택한 진행 상황(projectStage)에 대응하는 10단계 중 시작 단계를 "진행
  // 중"으로 미리 만들어둔다 — 그 이전 단계는 완료로 단정하지 않고 기본값인
  // "대기"로 남긴다. 생성과 초기 단계 상태를 하나의 트랜잭션으로 묶어 실패
  // 시 프로젝트만 반쪽으로 남는 일이 없게 한다.
  const startStepSlug =
    projectStageMeta[data.projectStage as ProjectStage].startStepSlug;

  const project = await prisma.$transaction(async (tx) => {
    const created = await tx.project.create({
      data: {
        userId: user.id,
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

    await tx.projectStepState.create({
      data: { projectId: created.id, slug: startStepSlug, status: "진행 중" },
    });

    return created;
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
