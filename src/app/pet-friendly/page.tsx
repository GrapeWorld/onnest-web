import { petFilters } from "@/data/partnerCategories";
import { CTASection } from "@/components/sections/CTASection";
import { Card, FeatureCard } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { PetFilterMockup } from "@/components/sections/NativeMockups";

const connectedServices = ["펫매트", "방묘창", "방충망 보강", "탈취 청소", "반려동물 동반 이사 가이드"];

export default function PetFriendlyPage() {
  return (
    <main>
      <section className="bg-cream px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Pet Friendly"
            title="반려동물 가능 여부도 입주 전 확인합니다."
            description="온네스트는 단순 가능/불가 표시가 아니라 계약 전 확인 필요 여부, 이전 입주자의 생활 경험, 주변 산책로, 동물병원, 방충망·창문 안전, 추가 보증금·청소비를 인수인계서와 체크리스트에 연결합니다."
          />
        </div>
      </section>
      <section className="bg-white px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <SectionTitle eyebrow="Filter" title="확정이 아니라, 확인해야 할 항목으로 안내합니다." />
              <div className="mt-10 grid gap-5 sm:grid-cols-2">
                {petFilters.map((filter) => <FeatureCard key={filter} title={filter} description="계약 조건과 관리규약을 확인해야 하는 생활 체크포인트입니다." />)}
              </div>
            </div>
            <PetFilterMockup />
          </div>
          <Card className="mt-8 bg-cream">
            반려동물 가능 여부는 계약 조건과 관리규약에 따라 달라질 수 있으므로, 온네스트는 가능 여부를 확정하지 않고 확인이 필요한 항목으로 안내합니다.
          </Card>
        </div>
      </section>
      <section className="bg-cream/60 px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Connect" title="반려동물 입주 준비 서비스도 연결합니다." />
          <div className="mt-10 grid gap-5 md:grid-cols-5">
            {connectedServices.map((service) => <Card key={service}>{service}</Card>)}
          </div>
        </div>
      </section>
      <CTASection title="반려동물과의 입주도 확인 중심으로 준비하세요." />
    </main>
  );
}
