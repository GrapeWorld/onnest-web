import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { VerifiedChannelIllustration } from "@/components/illustrations/HandoverIllustrations";
import { InsuranceGuidanceMockup } from "./NativeMockups";

export function InsuranceGuidanceSection() {
  return (
    <Section className="bg-cream/60">
      <SectionTitle
        eyebrow="Insurance"
        title="보증보험, 공식 채널로만 안내합니다."
        description="빌라·오피스텔처럼 보증금 리스크가 상대적으로 큰 계약일수록 보증보험 가입 여부 확인이 중요합니다. 온네스트는 상품을 비교하거나 판매하지 않고, 공식기관 또는 자격 있는 상담 채널로 연결합니다."
      />
      <div className="mt-10 grid gap-5 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div className="overflow-hidden rounded-[24px] border border-forest/10 shadow-card">
          <VerifiedChannelIllustration className="h-full w-full" />
        </div>
        <InsuranceGuidanceMockup />
      </div>
      <Card className="mt-5 bg-white">
        <p className="text-sm leading-7 text-ink/70">
          계약 단계에서 보증보험 가입 가능 여부를 미리 확인하는 것은 계약 이후 확인하는 것보다
          훨씬 중요합니다. 온네스트는 이 확인을 놓치지 않도록 입주 프로젝트 흐름 안에서 시점을
          안내하며, 가입 심사나 보장 여부를 직접 보장하지 않습니다.
        </p>
      </Card>
    </Section>
  );
}
