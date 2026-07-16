import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

const inquiryTypes = [
  "개인 고객 문의",
  "집/사무실/공장 확인 문의",
  "서비스 이용 문의",
  "제휴 문의",
  "이사/청소 파트너",
  "인터넷/렌탈 파트너",
  "입주 보수/인테리어 파트너",
  "반려동물 입주 서비스 파트너",
  "투자/지원사업 문의"
];

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
            {inquiryTypes.map((type) => <span key={type} className="rounded-full bg-white px-3 py-2 text-sm text-forest">{type}</span>)}
          </div>
        </div>
        <Card>
          <form className="grid gap-4">
            <label className="grid gap-2 text-sm font-semibold text-forest">
              이름
              <input className="rounded-2xl border border-forest/15 px-4 py-3 outline-none focus:border-forest" placeholder="이름을 입력하세요" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest">
              회사명/소속 <span className="font-normal text-ink/50">선택 입력</span>
              <input className="rounded-2xl border border-forest/15 px-4 py-3 outline-none focus:border-forest" placeholder="개인 고객은 비워두셔도 됩니다" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest">
              이메일
              <input className="rounded-2xl border border-forest/15 px-4 py-3 outline-none focus:border-forest" placeholder="이메일을 입력하세요" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest">
              연락처
              <input className="rounded-2xl border border-forest/15 px-4 py-3 outline-none focus:border-forest" placeholder="연락처를 입력하세요" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest">
              문의 유형
              <select className="rounded-2xl border border-forest/15 px-4 py-3 outline-none focus:border-forest">
                {inquiryTypes.map((type) => <option key={type}>{type}</option>)}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-forest">
              문의 내용
              <textarea className="min-h-36 rounded-2xl border border-forest/15 px-4 py-3 outline-none focus:border-forest" placeholder="확인하고 싶은 공간 유형, 지역, 입주/이전 일정, 궁금한 점을 적어주세요" />
            </label>
            <label className="flex gap-3 text-sm text-ink/70">
              <input type="checkbox" />
              개인정보 수집 및 이용에 동의합니다.
            </label>
            <Button href="#" className="w-full">문의 보내기</Button>
          </form>
        </Card>
      </div>
    </main>
  );
}
