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

/**
 * 트랜잭션 안에서만 쓰는 표식용 에러. candidateProperty의 조건부 갱신이
 * 0건이면(타인 소유, 존재하지 않음, 이미 다른 프로젝트에 연결됨, 동시
 * 요청에 선점당함) 이 에러를 던져 프로젝트·초기 단계 생성까지 포함한
 * 트랜잭션 전체를 롤백한다 — "매물과 연결됐다고 표시했지만 실제로는
 * 연결 안 된 프로젝트"가 반쪽으로 남는 걸 막는다.
 */
class CandidateLinkConflictError extends Error {}

const CANDIDATE_LINK_CONFLICT_MESSAGE =
  "이 매물 후보를 프로젝트에 연결할 수 없습니다. 이미 연결되었거나 사용할 수 없는 매물인지 확인해주세요.";

/**
 * sourceCandidatePropertyId는 projectWizardSchema에 없는 부가 필드라
 * 원본 body에서 직접 읽는다(이 필드 하나 때문에 위저드 스키마를 넓히지
 * 않는다 — zod object는 기본적으로 모르는 키를 조용히 무시하므로 이
 * 필드가 섞여 들어와도 projectWizardSchema.safeParse는 영향받지 않는다).
 * 필드 자체가 없으면 일반 프로젝트 생성, 있는데 문자열이 아니거나 빈
 * 문자열이면 잘못된 요청으로 거절한다 — 예전처럼 조용히 무시하고 그냥
 * 일반 프로젝트를 만들어버리면 사용자가 "매물과 연결됐다고 생각했는데
 * 실제로는 안 됐다"를 알아챌 방법이 없다.
 */
function readSourceCandidatePropertyId(
  body: unknown,
): { ok: true; value: string | null } | { ok: false } {
  if (!body || typeof body !== "object" || !("sourceCandidatePropertyId" in body)) {
    return { ok: true, value: null };
  }
  const raw = (body as Record<string, unknown>).sourceCandidatePropertyId;
  if (raw === undefined) return { ok: true, value: null };
  if (typeof raw !== "string" || raw.trim().length === 0) return { ok: false };
  return { ok: true, value: raw };
}

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

  const sourceResult = readSourceCandidatePropertyId(body);
  if (!sourceResult.ok) {
    return NextResponse.json(
      { error: "매물 후보 정보를 확인해주세요." },
      { status: 400 },
    );
  }
  const sourceCandidatePropertyId = sourceResult.value;

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

  let project;
  try {
    project = await prisma.$transaction(async (tx) => {
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
        // where에 userId·linkedProjectId:null을 함께 걸어 소유권과 "아직
        // 다른 프로젝트에 연결되지 않음"을 원자적으로 재확인한다. UPDATE
        // 문 하나로 조건과 갱신을 묶었기 때문에(PostgreSQL은 동시에 같은
        // 행을 갱신하려는 트랜잭션을 행 잠금으로 순서를 매기고, 나중에
        // 커밋되는 쪽은 WHERE절을 갱신된 값 기준으로 다시 평가한다) 두
        // 탭에서 동시에 같은 매물을 연결해도 하나만 성공한다 — 이를 위해
        // 격리 수준을 더 높일 필요는 없다.
        const result = await tx.candidateProperty.updateMany({
          where: { id: sourceCandidatePropertyId, userId: user.id, linkedProjectId: null },
          data: { linkedProjectId: created.id, status: "최종 후보", selectedAt: new Date() },
        });
        // 조건에 안 맞으면(타인 소유, 존재하지 않음, 이미 연결됨, 동시
        // 요청에 선점당함) 0건 갱신된다 — 이 경우 프로젝트·초기 단계
        // 생성까지 포함해 트랜잭션 전체를 롤백한다. 연결 실패를 조용히
        // 넘기고 프로젝트만 만들면 사용자가 "연결됐다고 생각했지만 실제로는
        // 안 됐다"를 알아챌 방법이 없다.
        if (result.count !== 1) {
          throw new CandidateLinkConflictError();
        }
      }

      return created;
    });
  } catch (error) {
    if (error instanceof CandidateLinkConflictError) {
      return NextResponse.json({ error: CANDIDATE_LINK_CONFLICT_MESSAGE }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ id: project.id }, { status: 201 });
}
