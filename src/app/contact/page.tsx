import { SectionTitle } from "@/components/ui/SectionTitle";
import { InquiryForm } from "@/components/sections/InquiryForm";
import { inquiryTypes } from "@/data/inquiries";

export default function ContactPage() {
  return (
    <main className="bg-cream px-5 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-[0.85fr_1.15fr]">
        <div>
          <SectionTitle
            eyebrow="Contact"
            title="개인 고객도, 파트너도 온네스트에 문의할 수 있습니다."
            description="집뿐 아니라 사무실과 공장처럼 실제 사용 전 확인이 필요한 공간도 인수인계서와 체크리스트 관점으로 상담할 수 있습니다. 온네스트는 개별 서비스를 직접 대체하지 않고 필요한 순간에 적절한 확인 항목과 연결 선택지를 정리합니다."
          />
          <div className="mt-8 flex flex-wrap gap-2">
            {inquiryTypes.map((type) => (
              <span
                key={type}
                className="rounded-full bg-white px-3 py-2 text-sm text-forest"
              >
                {type}
              </span>
            ))}
          </div>
        </div>
        <InquiryForm />
      </div>
    </main>
  );
}
