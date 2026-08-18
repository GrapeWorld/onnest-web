import { ClipboardCheck, PawPrint, Package, Sparkles, Truck, Wifi, Wrench } from "lucide-react";
import { serviceConnections } from "@/data/features";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";

const icons = [Truck, Sparkles, Wifi, Wrench, ClipboardCheck, Package, PawPrint];

/**
 * 서비스 소개 페이지 전용 — 기존 ServiceConnectionSection(긴 설명 카드 +
 * 목업 2개)과 달리 아이콘·이름만 보여주는 압축형 그리드다. 데이터는
 * ServiceConnectionSection과 같은 serviceConnections 배열을 그대로 쓴다.
 */
export function ServiceConnectionGrid() {
  return (
    <Section className="bg-white">
      <SectionTitle
        eyebrow="Connect"
        title="필요한 서비스를 연결합니다."
        align="center"
      />
      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {serviceConnections.map((service, index) => {
          const Icon = icons[index];
          return (
            <div
              key={service}
              className="flex min-w-0 flex-col items-center gap-3 rounded-2xl border border-forest/10 bg-cream/60 px-4 py-6 text-center"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-mint text-forest">
                <Icon className="h-5 w-5" strokeWidth={2.25} aria-hidden="true" />
              </span>
              <span className="break-words text-sm font-bold text-forest">{service}</span>
            </div>
          );
        })}
      </div>
      <p className="mt-8 text-center text-sm text-ink/60">
        필요한 시점에 연결을 신청하고, 진행 상태와 받은 견적을 한곳에서 확인할 수 있습니다.
      </p>
    </Section>
  );
}
