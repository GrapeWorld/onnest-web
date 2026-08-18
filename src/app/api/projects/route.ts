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

  // 매물 후보에서 "이 매물로 프로젝트 만들기"로 들어온 경우에만 존재하는
  // 부가 필드. projectWizardSchema에는 없는 값이라 원본 body에서 직접 읽는다.
  // 여기서 검증하지 않고 아래 트랜잭션 안에서 소유권을 다시 확인한다 —
  // 위조된 id를 보내도 연결되지 않을 뿐, 프로젝트 생성 자체는 항상 계속된다.
  const sourceCandidatePropertyId =
    body && typeof body === "object" && "sourceCandidatePropertyId" in body &&
    typeof (body as Record<string, unknown>).sourceCandidatePropertyId === "string"
      ? ((body as Record<string, unknown>).sourceCandidatePropertyId as string)
      : null;

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

    if (sourceCandidatePropertyId) {
      // updateMany(단건이지만) + where에 userId·linkedProjectId:null을 함께 걸어
      // 소유권과 "아직 다른 프로젝트에 연결되지 않음"을 원자적으로 재확인한다.
      // 조건에 안 맞으면(타인 소유, 이미 연결됨 등) 조용히 0건 갱신되고 프로젝트
      // 생성 자체는 그대로 성공한다 — 연결은 부가 기능이라 실패해도 핵심 저장을
      // 막지 않는다.
      await tx.candidateProperty.updateMany({
        where: { id: sourceCandidatePropertyId, userId: user.id, linkedProjectId: null },
        data: { linkedProjectId: created.id, status: "최종 후보", selectedAt: new Date() },
      });
    }

    return created;
  });

  return NextResponse.json({ id: project.id }, { status: 201 });
}
