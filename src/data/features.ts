export const problemPoints = [
  {
    title: "긍정적인 설명만 듣게 됩니다",
    description: "중개 과정에서는 장점 위주의 설명을 듣게 되고, 채광·소음·수납 같은 실제 생활 정보는 입주 후에야 알게 되는 경우가 많습니다."
  },
  {
    title: "생활 정보는 사각지대에 있습니다",
    description: "이전 거주자가 겪은 문제나 팁은 후기 형태로도 잘 남지 않고, 남더라도 다음 입주자에게 전달되지 않습니다."
  },
  {
    title: "계약 안전 확인이 파편화되어 있습니다",
    description: "등기부등본, 전입신고, 확정일자, 보증보험 확인을 각자 다른 곳에서 따로 챙겨야 해 놓치기 쉽습니다."
  },
  {
    title: "입주 준비가 여러 서비스에 흩어져 있습니다",
    description: "이사, 청소, 인터넷 설치, 보수를 서로 다른 앱과 채팅방에서 따로 예약하고 확인해야 합니다."
  }
];

export type SolutionFeatureCard = {
  id: string;
  label: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  className: string;
  objectPosition?: string;
};

export const solutionFeatureCards: SolutionFeatureCard[] = [
  {
    id: "handover",
    label: "Pillar",
    title: "우리집 인수인계서",
    description: "퇴거자 또는 이전 사용자가 남기는 생활·사용 정보. 후기가 아니라 다음 입주자와 이용자를 위해 남기는 생활 정보입니다.",
    image: "/images/onnest/features/handover.webp",
    alt: "따뜻한 아침 햇살이 드는 아파트 거실에서 이전 거주자가 새 입주자에게 열쇠와 인수인계 자료를 건네는 모습",
    className: "md:col-span-2 lg:col-span-7 lg:row-span-2"
  },
  {
    id: "contract-check",
    label: "Pillar",
    title: "계약 안전 체크패스",
    description: "HUG 안심전세 앱, 등기부등본, 전입신고, 확정일자, 계약 자료 보관을 체크리스트로 관리합니다.",
    image: "/images/onnest/features/contract-check.webp",
    alt: "계약 서류와 체크리스트, 돋보기가 책상 위에 정돈되어 있는 편집 일러스트",
    className: "lg:col-span-5"
  },
  {
    id: "official-channel",
    label: "Pillar",
    title: "보증보험 공식 채널 연결",
    description: "보험상품을 비교하거나 판매하지 않고, 공식기관 또는 자격 있는 상담 채널 확인을 돕습니다.",
    image: "/images/onnest/features/official-channel.webp",
    alt: "주택 서류에서 공식기관 창구로 이어지는 안내 경로를 그린 편집 일러스트",
    className: "lg:col-span-5"
  },
  {
    id: "move-in-project",
    label: "Pillar",
    title: "입주 프로젝트 관리",
    description: "집, 사무실, 공장 후보 저장부터 계약, 이전, 청소, 설치, 보수, 퇴거 시 정보 남기기까지 하나의 흐름으로 봅니다.",
    image: "/images/onnest/features/move-in-project.webp",
    alt: "집 선택부터 계약, 이사, 입주 완료까지 이어지는 흐름을 그린 편집 일러스트",
    className: "md:col-span-2 lg:col-span-6"
  },
  {
    id: "service-matching",
    label: "Pillar",
    title: "입주 서비스·제품 연결",
    description: "광고 노출이 아니라 집 상태와 입주 단계에 맞는 서비스 선택지를 정리합니다.",
    image: "/images/onnest/features/service-matching.webp",
    alt: "집을 중심으로 이사, 청소, 인터넷, 생활제품이 정돈되어 연결된 편집 일러스트",
    className: "md:col-span-2 lg:col-span-6"
  }
];

export const handoverPreview = [
  "채광", "환기", "수납", "결로", "곰팡이", "벌레", "주차", "소음", "인터넷", "반려동물", "생활 인프라", "입주 전 확인사항"
];

export const serviceConnections = [
  "이사·사무실 이전",
  "입주청소",
  "인터넷 설치",
  "입주 보수·인테리어",
  "사무실·공장 사용 전 점검",
  "렌탈·생활제품",
  "반려동물 입주 준비"
];

export const projectTools = [
  "현재 단계 카드",
  "체크리스트 패널",
  "자료 보관함",
  "생활 정보 뷰",
  "맞춤 추천 카드"
];
