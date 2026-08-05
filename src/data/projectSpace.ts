import {
  Building2,
  Factory,
  Home,
  Store,
  type LucideIcon,
} from "lucide-react";

/**
 * 새 프로젝트 만들기 위저드의 공간·거래 조건 데이터 정의.
 *
 * 공개 문의(Inquiry) 폼의 `src/data/inquiries.ts`의 `spaceTypes`와는
 * 완전히 별개다 — 그쪽은 4종 고정값을 쓰는 다른 기능이고, 이 파일은
 * 프로젝트 생성 전용이다.
 */

export type SpaceCategory = "residential" | "office" | "commercial" | "industrial";

export type SpaceSubtype =
  | "apartment"
  | "residential_officetel"
  | "villa_multifamily"
  | "detached_multifamily"
  | "studio"
  | "other_residential"
  | "office"
  | "business_officetel"
  | "coworking"
  | "knowledge_industry_office"
  | "other_office"
  | "retail"
  | "restaurant"
  | "cafe"
  | "store"
  | "neighborhood_facility"
  | "other_commercial"
  | "factory"
  | "warehouse"
  | "logistics"
  | "knowledge_industry_factory"
  | "workshop"
  | "other_industrial";

export type TransactionType =
  | "purchase"
  | "jeonse"
  | "monthly_rent"
  | "lease"
  | "undecided";

export type ProjectStage =
  | "searching"
  | "candidate_selected"
  | "visit_planned"
  | "contract_review"
  | "contract_completed"
  | "move_in_preparing";

export const spaceCategoryMeta: Record<
  SpaceCategory,
  { label: string; description: string; icon: LucideIcon }
> = {
  residential: {
    label: "주거",
    description: "아파트, 빌라, 주거용 오피스텔, 원룸 등",
    icon: Home,
  },
  office: {
    label: "업무",
    description: "사무실, 업무용 오피스텔, 공유오피스 등",
    icon: Building2,
  },
  commercial: {
    label: "상업",
    description: "상가, 점포, 음식점, 판매시설 등",
    icon: Store,
  },
  industrial: {
    label: "산업",
    description: "공장, 창고, 지식산업센터 등",
    icon: Factory,
  },
};

export const spaceCategories = Object.keys(
  spaceCategoryMeta,
) as SpaceCategory[];

export const subtypesByCategory: Record<
  SpaceCategory,
  { value: SpaceSubtype; label: string }[]
> = {
  residential: [
    { value: "apartment", label: "아파트" },
    { value: "residential_officetel", label: "주거용 오피스텔" },
    { value: "villa_multifamily", label: "빌라·다세대" },
    { value: "detached_multifamily", label: "단독·다가구" },
    { value: "studio", label: "원룸·투룸" },
    { value: "other_residential", label: "기타 주거시설" },
  ],
  office: [
    { value: "office", label: "일반 사무실" },
    { value: "business_officetel", label: "업무용 오피스텔" },
    { value: "coworking", label: "공유오피스" },
    { value: "knowledge_industry_office", label: "지식산업센터 사무공간" },
    { value: "other_office", label: "기타 업무시설" },
  ],
  commercial: [
    { value: "retail", label: "일반 상가" },
    { value: "restaurant", label: "음식점" },
    { value: "cafe", label: "카페" },
    { value: "store", label: "판매점" },
    { value: "neighborhood_facility", label: "근린생활시설" },
    { value: "other_commercial", label: "기타 상업시설" },
  ],
  industrial: [
    { value: "factory", label: "공장" },
    { value: "warehouse", label: "창고" },
    { value: "logistics", label: "물류시설" },
    { value: "knowledge_industry_factory", label: "지식산업센터 제조공간" },
    { value: "workshop", label: "작업장" },
    { value: "other_industrial", label: "기타 산업시설" },
  ],
};

/** 세부유형 값으로 대분류·라벨을 거꾸로 찾는다(수정 폼 초기값 복원용). */
export function findSubtype(value: string) {
  for (const category of spaceCategories) {
    const match = subtypesByCategory[category].find(
      (subtype) => subtype.value === value,
    );
    if (match) return { category, ...match };
  }
  return null;
}

export const transactionOptionsByCategory: Record<
  SpaceCategory,
  TransactionType[]
> = {
  residential: ["purchase", "jeonse", "monthly_rent", "undecided"],
  office: ["purchase", "lease", "undecided"],
  commercial: ["purchase", "lease", "undecided"],
  industrial: ["purchase", "lease", "undecided"],
};

export const transactionTypeLabels: Record<TransactionType, string> = {
  purchase: "매매",
  jeonse: "전세",
  monthly_rent: "월세",
  lease: "임대",
  undecided: "아직 미정",
};

export type WizardFieldType = "text" | "number" | "date" | "select" | "textarea";

export type WizardFieldDef = {
  key: string;
  label: string;
  type: WizardFieldType;
  placeholder?: string;
  options?: { value: string; label: string }[];
  required?: boolean;
};

/**
 * 거래유형별 2단계 필드 정의 (스펙 4-3 A~F). "아직 미정"(undecided)은
 * 카테고리 무관 공통 필드를 쓴다.
 */
export const transactionFieldsByType: Record<TransactionType, WizardFieldDef[]> = {
  purchase: [
    { key: "priceMin", label: "희망 매매가 최소", type: "text" },
    { key: "priceMax", label: "희망 매매가 최대", type: "text" },
    {
      key: "financingMethod",
      label: "자금 조달 방식",
      type: "select",
      options: [
        { value: "own_funds", label: "자기자금" },
        { value: "loan_included", label: "대출 포함" },
        { value: "undecided", label: "미정" },
      ],
    },
    {
      key: "vatIncluded",
      label: "부가세 포함 여부",
      type: "select",
      options: [
        { value: "included", label: "포함" },
        { value: "separate", label: "별도" },
        { value: "unconfirmed", label: "확인 필요" },
      ],
    },
  ],
  jeonse: [
    { key: "depositMin", label: "희망 전세보증금 최소", type: "text" },
    { key: "depositMax", label: "희망 전세보증금 최대", type: "text" },
    {
      key: "guaranteeInsuranceCheck",
      label: "보증보험 공식 채널 확인 필요 여부",
      type: "select",
      options: [
        { value: "planned", label: "확인 예정" },
        { value: "done", label: "확인 완료" },
        { value: "undecided", label: "아직 미정" },
      ],
    },
  ],
  monthly_rent: [
    { key: "depositMin", label: "희망 보증금 최소", type: "text" },
    { key: "depositMax", label: "희망 보증금 최대", type: "text" },
    { key: "rentMin", label: "희망 월세 최소", type: "text" },
    { key: "rentMax", label: "희망 월세 최대", type: "text" },
    { key: "maintenanceFee", label: "예상 관리비", type: "text" },
  ],
  lease: [
    { key: "depositMin", label: "희망 보증금 최소", type: "text" },
    { key: "depositMax", label: "희망 보증금 최대", type: "text" },
    { key: "rentMin", label: "희망 월 임대료 최소", type: "text" },
    { key: "rentMax", label: "희망 월 임대료 최대", type: "text" },
    { key: "maintenanceFee", label: "예상 관리비", type: "text" },
    {
      key: "vatIncluded",
      label: "부가세 포함 여부",
      type: "select",
      options: [
        { value: "included", label: "포함" },
        { value: "separate", label: "별도" },
        { value: "unconfirmed", label: "확인 필요" },
      ],
    },
    { key: "leaseTerm", label: "희망 계약기간", type: "text" },
  ],
  undecided: [
    { key: "budgetRange", label: "전체 예산 범위", type: "text" },
    {
      key: "interestedTypes",
      label: "관심 거래 방식",
      type: "text",
      placeholder: "예: 매매, 임대 모두 비교 중",
    },
  ],
};

/**
 * 공간별 "상세 조건 추가" 선택 입력 필드 (스펙 4-4). 세부유형(SpaceSubtype)
 * 단위로 다른 항목을 보여줘야 하는 경우가 있어 subtype 키로 정의하고,
 * 없는 subtype은 대분류 공통(주거 등)으로 폴백한다.
 */
export const additionalFieldsBySubtype: Partial<Record<SpaceSubtype, WizardFieldDef[]>> = {
  retail: [
    {
      key: "keyMoney",
      label: "권리금 여부",
      type: "select",
      options: [
        { value: "none", label: "없음" },
        { value: "present", label: "있음" },
        { value: "unconfirmed", label: "확인 필요" },
      ],
    },
    { key: "keyMoneyRange", label: "권리금 예상 범위", type: "text" },
    { key: "businessType", label: "업종", type: "text" },
    { key: "businessTypeCheckNeeded", label: "영업 가능 업종 확인 필요", type: "text" },
    { key: "exclusiveArea", label: "전용면적", type: "text" },
    { key: "groundFloor", label: "1층 여부", type: "text" },
    { key: "parkingNeeded", label: "주차 필요 여부", type: "text" },
  ],
  office: [
    { key: "seatCount", label: "희망 좌석 수", type: "number" },
    { key: "meetingRoomNeeded", label: "회의실 필요 여부", type: "text" },
    { key: "parkingCount", label: "주차 대수", type: "number" },
    { key: "rentFreeNegotiable", label: "렌트프리 협의 여부", type: "text" },
    { key: "internetNeeded", label: "인터넷 설치 필요 여부", type: "text" },
    { key: "occupancy", label: "입주 가능 인원", type: "number" },
  ],
  factory: [
    { key: "powerCapacity", label: "필요한 전력 용량", type: "text" },
    { key: "ceilingHeight", label: "층고", type: "text" },
    { key: "truckAccessNeeded", label: "화물차 진입 필요 여부", type: "text" },
    { key: "hoistCraneNeeded", label: "호이스트·크레인 필요 여부", type: "text" },
    { key: "manufacturingRegistrationCheck", label: "제조업 등록 가능 여부 확인", type: "text" },
    { key: "noiseVibration", label: "소음·진동 조건", type: "text" },
    { key: "loadingSpace", label: "주차 및 상하차 공간", type: "text" },
  ],
  warehouse: [
    { key: "requiredArea", label: "필요한 면적", type: "text" },
    { key: "ceilingHeight", label: "층고", type: "text" },
    { key: "dockNeeded", label: "도크 필요 여부", type: "text" },
    { key: "truckAccessNeeded", label: "화물차 진입 가능 여부", type: "text" },
    { key: "coldStorage", label: "냉장·냉동 여부", type: "text" },
    { key: "loadingSpace", label: "상하차 공간", type: "text" },
    { key: "operates24h", label: "24시간 운영 필요 여부", type: "text" },
  ],
  apartment: [
    { key: "petFriendly", label: "반려동물 동반 여부", type: "text" },
    { key: "parkingNeeded", label: "주차 필요 여부", type: "text" },
    { key: "elevatorNeeded", label: "엘리베이터 필요 여부", type: "text" },
    { key: "occupancy", label: "입주 인원", type: "number" },
    { key: "roomCount", label: "필요한 방 개수", type: "number" },
    {
      key: "checkPoints",
      label: "주요 확인 항목",
      type: "text",
      placeholder: "채광, 결로, 소음, 수납, 주차, 반려동물, 인터넷 중 선택",
    },
  ],
};

/** subtype에 정의가 없으면 같은 대분류의 "대표" subtype 정의를 빌려 쓴다. */
export function getAdditionalFields(category: SpaceCategory, subtype: string) {
  const bySubtype = additionalFieldsBySubtype[subtype as SpaceSubtype];
  if (bySubtype) return bySubtype;
  const fallbackBySubtype: Record<SpaceCategory, SpaceSubtype> = {
    residential: "apartment",
    office: "office",
    commercial: "retail",
    industrial: "factory",
  };
  return additionalFieldsBySubtype[fallbackBySubtype[category]] ?? [];
}

export const projectStageMeta: Record<
  ProjectStage,
  { label: string; startStepSlug: string }
> = {
  searching: { label: "공간 탐색 중", startStepSlug: "candidate" },
  candidate_selected: { label: "후보 공간 결정", startStepSlug: "handover-check" },
  visit_planned: { label: "방문 예정", startStepSlug: "visit-check" },
  contract_review: { label: "계약 검토 중", startStepSlug: "safety-checkpass" },
  contract_completed: { label: "계약 완료", startStepSlug: "move-cleaning" },
  move_in_preparing: { label: "입주·사용 준비 중", startStepSlug: "internet-repair" },
};

export const projectStages = Object.keys(projectStageMeta) as ProjectStage[];
