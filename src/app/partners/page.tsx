import { partnerCategories, partnerValues } from "@/data/partnerCategories";
import { CTASection } from "@/components/sections/CTASection";
import { Card, FeatureCard } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default function PartnersPage() {
  return (
    <main>
      <section className="bg-cream px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle
            eyebrow="Partners"
            title="입주 과정에 필요한 서비스를 적절한 순간에 연결합니다."
            description="온네스트는 이사, 청소, 인터넷, 입주 보수, 렌탈, 생활제품 서비스를 직접 대체하지 않습니다. 사용자의 입주 프로젝트 안에서 필요한 순간에 적절한 제휴 채널로 연결합니다."
          />
        </div>
      </section>
      <section className="bg-white px-5 py-16 md:py-24">
        <div className="mx-auto max-w-7xl">
          <SectionTitle eyebrow="Category" title="파트너 카테고리" />
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {partnerCategories.map((category) => <FeatureCard key={category} title={category} description="입주 프로젝트의 필요한 순간에 연결되는 파트너 영역입니다." />)}
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-4">
            {partnerValues.map((value) => <Card key={value}>{value}</Card>)}
          </div>
          <Card className="mt-8 bg-cream">
            온네스트는 각 파트너 서비스의 직접 제공자가 아니며, 서비스 제공, 견적, 계약, 결제, 환불, A/S는 각 파트너사의 정책에 따릅니다.
          </Card>
        </div>
      </section>
      <CTASection />
    </main>
  );
}
