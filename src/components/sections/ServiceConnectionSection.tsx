import { serviceConnections } from "@/data/features";
import { Card, FeatureCard } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { ReportPreviewMockup, ServiceConnectionMockup } from "./NativeMockups";

export function ServiceConnectionSection() {
  return (
    <section className="bg-white px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Connect"
          title="필요한 서비스를 적절한 순간에 연결합니다."
          description="온네스트는 각 서비스를 직접 대체하지 않습니다. 입주 프로젝트 안에서 필요한 시점에 맞는 선택지를 정리합니다."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {serviceConnections.map((service) => (
            <FeatureCard key={service} title={service} description="집 상태, 예산, 입주 일정, 인수인계 정보를 바탕으로 확인할 선택지를 제공합니다." />
          ))}
        </div>
        <div className="mt-10 grid gap-5 lg:grid-cols-2">
          <ServiceConnectionMockup />
          <ReportPreviewMockup />
        </div>
        <Card className="mt-8 bg-cream">
          특정 렌탈 상품을 강매하지 않고, 제휴 혜택이 포함될 수 있음을 명확히 안내합니다.
        </Card>
      </div>
    </section>
  );
}
