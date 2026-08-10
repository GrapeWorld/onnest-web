export type ProjectStep = {
  slug: string;
  number: number;
  group: string;
  title: string;
  pageDescription: string;
  summary: string;
  checklist: string[];
  actions: string[];
  note: string;
};

export const projectSteps: ProjectStep[] = [
  {
    slug: "candidate",
    number: 1,
    group: "탐색 및 확인",
    title: "집 후보 저장",
    summary:
      "관심 공간을 프로젝트에 저장하고 주소, 일정, 확인할 조건을 한곳에 모읍니다.",
    pageDescription:
      "입주 프로젝트의 첫 단계입니다. 관심 공간을 저장하고 기본 조건을 정리합니다.",
    checklist: [
      "주소와 건물명 확인",
      "입주 예정일 입력",
      "예산 범위 메모",
      "반려동물/주차 등 우선 조건 선택",
    ],
    actions: [
      "후보 비교표 보기",
      "방문 일정 잡기",
      "이전 이용자의 기록 있는지 확인",
    ],
    note: "온네스트는 매물 계약을 알선하지 않고, 사용자가 확인할 후보 정보를 정리합니다.",
  },
  {
    slug: "handover-check",
    number: 2,
    group: "탐색 및 확인",
    title: "이전 이용자의 기록 확인",
    summary:
      "이전 사용자가 남긴 생활 정보와 입주 전 확인할 체크포인트를 살펴봅니다.",
    pageDescription:
      "이전 사용자의 생활 정보와 확인 필요 항목을 살펴보는 단계입니다.",
    checklist: [
      "채광/환기 태그 확인",
      "결로/곰팡이 확인 필요 항목 보기",
      "주차·소음 체감 정보 확인",
      "반려동물 생활 팁 확인",
    ],
    actions: ["생활 정보 미리보기", "확인 질문 저장", "리포트 보기"],
    note: "이 기록은 사람 평가가 아니라 공간과 사용 경험을 전달하는 참고 정보입니다.",
  },
  {
    slug: "visit-check",
    number: 3,
    group: "탐색 및 확인",
    title: "방문 전 체크리스트",
    summary: "방문 전에 놓치기 쉬운 질문과 현장 확인 항목을 준비합니다.",
    pageDescription:
      "채광, 환기, 수납, 결로, 곰팡이, 벌레, 주차, 소음 등 방문 시 확인할 항목을 정리합니다.",
    checklist: [
      "창문/환기 확인",
      "수납 깊이 확인",
      "결로 흔적 확인",
      "야간 주차 질문 준비",
    ],
    actions: [
      "방문 질문지 만들기",
      "사진 체크 항목 보기",
      "방문 일정 캘린더에 추가",
    ],
    note: "방문 체크는 현장 확인을 돕는 용도이며 특정 공간의 적합성을 단정하지 않습니다.",
  },
  {
    slug: "safety-checkpass",
    number: 4,
    group: "계약 및 안전 확인",
    title: "계약 안전 체크패스",
    summary:
      "HUG, 등기부등본, 전입신고, 확정일자 등 공식 확인 절차를 체크리스트로 관리합니다.",
    pageDescription:
      "위험도를 직접 판정하지 않고, HUG 안심전세 앱, 등기부등본, 전입신고, 확정일자 등 공식 확인 흐름을 체크합니다.",
    checklist: [
      "HUG 안심전세 앱 확인",
      "등기부등본 발급",
      "계약 자료 보관",
      "전입신고/확정일자 일정 확인",
    ],
    actions: ["체크패스 시작", "문서함 열기", "공식기관 확인 메모"],
    note: "온네스트는 전세사기 위험도나 계약 안전성을 직접 판정하지 않습니다.",
  },
  {
    slug: "deposit-insurance",
    number: 5,
    group: "계약 및 안전 확인",
    title: "보증보험 공식 채널 연결",
    summary: "HUG/HF/SGI 등 공식기관 또는 자격 있는 상담 채널 확인을 돕습니다.",
    pageDescription:
      "보험상품 비교·추천·판매 없이 HUG/HF/SGI 등 공식기관 또는 자격 있는 상담 채널 확인을 돕습니다.",
    checklist: [
      "공식기관 링크 확인",
      "필요 서류 목록 확인",
      "상담 채널 선택",
      "신청 일정 메모",
    ],
    actions: ["공식 채널 보기", "서류 체크리스트 저장", "상담 요청 준비"],
    note: "보험상품 비교·추천·판매를 하지 않으며 가입 가능 여부도 직접 판정하지 않습니다.",
  },
  {
    slug: "contract-day",
    number: 6,
    group: "계약 및 안전 확인",
    title: "계약 당일 체크",
    summary:
      "계약 당일 확인할 문서, 입금, 특약, 보관 자료를 순서대로 점검합니다.",
    pageDescription:
      "계약 당일 확인할 문서와 일정, 보관 자료를 정리하는 단계입니다.",
    checklist: [
      "최신 등기 확인",
      "계약서 주요 항목 확인",
      "입금 기록 보관",
      "특약/확인사항 메모",
    ],
    actions: [
      "계약 당일 체크 열기",
      "자료 보관함 이동",
      "캘린더에 다음 일정 추가",
    ],
    note: "계약 내용의 적정성 판단은 전문가 또는 공식기관 확인이 필요한 영역입니다.",
  },
  {
    slug: "move-cleaning",
    number: 7,
    group: "입주 준비",
    title: "입주청소·이사 연결",
    summary: "입주 일정에 맞춰 이사와 입주청소 연결 시점을 관리합니다.",
    pageDescription: "입주청소와 이사 연결 시점, 상담 요청 준비를 관리합니다.",
    checklist: [
      "이사 예정일 입력",
      "입주청소 희망일 선택",
      "엘리베이터/주차 사용 가능 여부 확인",
      "파트너 상담 요청 준비",
    ],
    actions: ["이사 연결 보기", "입주청소 견적 요청", "서비스 리드 저장"],
    note: "온네스트는 각 서비스의 직접 제공자가 아니며 견적/계약/A/S는 파트너 정책을 따릅니다.",
  },
  {
    slug: "internet-repair",
    number: 8,
    group: "입주 준비",
    title: "인터넷·보수·인테리어 연결",
    summary:
      "인터넷 설치, 도배·방충망·도어락·수전 등 소규모 보수 필요 여부를 정리합니다.",
    pageDescription:
      "인터넷 설치와 소규모 보수, 인테리어 확인 항목을 정리합니다.",
    checklist: [
      "인터넷 설치 가능 일정 확인",
      "방충망/도어락 상태 확인",
      "곰팡이/실리콘 보수 메모",
      "현장 사진 업로드",
    ],
    actions: ["인터넷 설치 요청", "소규모 보수 체크", "사진 자료함 열기"],
    note: "전체 리모델링 중개가 아니라 입주 전 확인과 소규모 보수 연결 중심입니다.",
  },
  {
    slug: "products",
    number: 9,
    group: "입주 준비",
    title: "렌탈·생활제품 맞춤 추천",
    summary:
      "제습기, 수납가구, 인터넷, 생활가전 등 필요한 선택지를 집 상태에 맞춰 정리합니다.",
    pageDescription:
      "특정 상품 강매가 아니라 집 상태, 예산, 거주 형태, 생활 정보를 바탕으로 선택지를 정리합니다.",
    checklist: [
      "예산 범위 선택",
      "필요 제품 선택",
      "집 상태 태그 반영",
      "제휴 혜택 포함 여부 확인",
    ],
    actions: ["맞춤 준비물 보기", "제품 후보 저장", "렌탈 상담 요청 준비"],
    note: "특정 상품을 강매하지 않고 사용자가 비교할 선택지를 정리합니다.",
  },
  {
    slug: "exit-handover",
    number: 10,
    group: "다음 이용자에게 전달",
    title: "퇴거 시 다음 이용자에게 정보 남기기",
    summary:
      "내가 사용하며 알게 된 생활 정보를 다음 사용자에게 안전하게 남깁니다.",
    pageDescription:
      "퇴거 시 다음 이용자를 위해 꼭 알아둘 생활 정보를 남기는 단계입니다.",
    checklist: [
      "생활 팁 작성",
      "확인 필요 항목 선택",
      "개인정보/비방 표현 제거",
      "AI 검수 요청",
    ],
    actions: ["생활 정보 남기기", "검수 상태 보기", "리워드 확인"],
    note: "사람 평가나 단정 표현이 아니라 공간 사용 경험과 확인 항목을 남깁니다.",
  },
];

export const stepStatuses = ["대기", "진행 중", "완료"] as const;

export type StepStatus = (typeof stepStatuses)[number];

export const stepStatusClassName: Record<string, string> = {
  완료: "bg-mint text-forest",
  "진행 중": "bg-navy text-white",
  대기: "bg-cream text-forest",
};

/** 없는 slug면 undefined를 돌려준다. 호출부에서 404 처리한다. */
export function getProjectStep(slug: string) {
  return projectSteps.find((step) => step.slug === slug);
}
