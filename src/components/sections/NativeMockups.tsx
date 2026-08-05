import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";

export function HandoverFlowMockup() {
  return (
    <Card className="bg-white">
      <p className="text-sm font-bold text-sage">우리집 인수인계서 미리보기</p>
      <h3 className="mt-3 text-2xl font-black text-forest">이전 사용자가 남긴 생활 정보</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {["채광 좋음", "수납 넉넉", "결로 확인 필요", "야간 주차 확인 필요"].map((item) => (
          <div key={item} className="rounded-2xl bg-cream px-4 py-3 text-sm font-semibold text-ink/75">
            {item}
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-mint p-4 text-sm leading-7 text-forest">
        겨울철 창가 결로와 저녁 시간대 주차 상황은 입주 전 직접 확인해보는 것을 권장합니다.
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {["주소 확인", "장점 선택", "확인할 점", "AI 검수", "리워드"].map((step) => (
          <Badge key={step} className="bg-white text-forest shadow-card">
            {step}
          </Badge>
        ))}
      </div>
    </Card>
  );
}

export function ServiceConnectionMockup() {
  const services = ["이사", "입주청소", "인터넷 설치", "소규모 보수", "방충망 보강", "생활제품 확인"];

  return (
    <Card className="bg-mint">
      <p className="text-sm font-bold text-forest/70">입주 프로젝트 연결 보드</p>
      <h3 className="mt-3 text-2xl font-black text-forest">필요한 순간에 필요한 연결만</h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {services.map((service) => (
          <div key={service} className="rounded-2xl bg-white px-4 py-4 text-sm font-bold text-forest shadow-card">
            {service}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function ReportPreviewMockup() {
  return (
    <Card className="bg-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold text-sage">Premium Report</p>
          <h3 className="mt-2 text-2xl font-black text-forest">인수인계 리포트 예시</h3>
          <p className="mt-2 text-sm leading-7 text-ink/65">계약 판단이 아닌, 확인할 체크포인트를 구조화한 참고 정보입니다.</p>
        </div>
        <Badge className="bg-mint text-forest">참고 정보</Badge>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {[
          ["야간 주차 체감", "평일 밤 9시 이후 확인 권장"],
          ["시간대별 소음", "생활 시간대별 체감 정보"],
          ["결로·곰팡이", "겨울철 창가 확인 필요"],
          ["입주 전 질문지", "방문 시 확인할 질문 정리"],
        ].map(([title, description]) => (
          <div key={title} className="rounded-2xl border border-forest/10 bg-cream p-4">
            <p className="font-bold text-forest">{title}</p>
            <p className="mt-2 text-sm text-ink/65">{description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PetFilterMockup() {
  const items = ["반려동물 가능 여부 확인 필요", "주변 산책로 확인", "동물병원 근처", "방충망·창문 안전 확인", "추가 보증금 확인"];

  return (
    <Card className="bg-white">
      <p className="text-sm font-bold text-sage">Pet Friendly Check</p>
      <h3 className="mt-3 text-2xl font-black text-forest">가능/불가보다 확인 항목 중심으로</h3>
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-3 rounded-2xl bg-mint px-4 py-3 text-sm font-semibold text-forest">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">✓</span>
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function SafetyCheckpassMockup() {
  const items = ["HUG 확인", "등기부등본 확인", "보증보험 공식 채널 연결", "전입신고 일정", "확정일자 일정", "계약 자료 보관"];

  return (
    <Card className="bg-white">
      <p className="text-sm font-bold text-sage">Safety Checkpass</p>
      <h3 className="mt-3 text-2xl font-black text-forest">위험도 판정이 아닌 확인 절차 관리</h3>
      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <div key={item} className={index === 2 ? "rounded-2xl bg-navy px-4 py-3 text-sm font-semibold text-white" : "rounded-2xl bg-mint px-4 py-3 text-sm font-semibold text-forest"}>
            {item}
          </div>
        ))}
      </div>
    </Card>
  );
}

export function InsuranceGuidanceMockup() {
  const channels = [
    ["HUG 주택도시보증공사", "전세보증금반환보증 공식 가입 채널 안내"],
    ["HF 한국주택금융공사", "전세지킴보증 공식 가입 채널 안내"],
    ["SGI 서울보증", "전세금보장신용보험 공식 가입 채널 안내"],
  ];

  return (
    <Card className="bg-white">
      <p className="text-sm font-bold text-sage">Official Channel</p>
      <h3 className="mt-3 text-2xl font-black text-forest">비교·판매가 아닌, 공식 채널 연결</h3>
      <div className="mt-5 space-y-3">
        {channels.map(([title, description]) => (
          <div key={title} className="rounded-2xl border border-forest/10 bg-cream/70 p-4">
            <p className="font-bold text-forest">{title}</p>
            <p className="mt-1 text-sm leading-6 text-ink/65">{description}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-2xl bg-mint p-4 text-sm font-semibold leading-7 text-forest">
        온네스트는 보증보험 상품을 비교·판매하지 않습니다. 공식기관 채널로 연결하고 가입 여부를
        확인하도록 돕습니다.
      </div>
    </Card>
  );
}

export function AdminReviewMockup() {
  return (
    <Card className="bg-white">
      <p className="text-sm font-bold text-sage">Admin Review</p>
      <h3 className="mt-3 text-2xl font-black text-forest">인수인계서 검수 현황</h3>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {[
          ["신고 접수", "18"],
          ["서비스 리드", "56"],
          ["파트너 요청", "29"],
          ["리워드 처리", "41"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-cream p-4">
            <p className="text-xs font-bold text-ink/55">{label}</p>
            <p className="mt-2 text-2xl font-black text-forest">{value}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 space-y-3">
        {["서울 강남구 오피스텔", "부산 해운대구 아파트", "경기 성남시 분당 오피스"].map((item) => (
          <div key={item} className="flex items-center justify-between rounded-2xl border border-forest/10 px-4 py-3 text-sm">
            <span className="font-semibold text-forest">{item}</span>
            <span className="text-ink/55">검수 대기</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
