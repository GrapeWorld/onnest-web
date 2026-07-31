import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";

export default function ContactCompletePage() {
  return (
    <main className="bg-cream px-5 py-16 md:py-24">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-[0.9fr_1.1fr]">
        <SectionTitle
          eyebrow="Contact Received"
          title="문의가 접수되었습니다."
          description="담당자가 문의 내용을 확인한 뒤 입력하신 연락처로 상담 가능 시간과 필요한 체크리스트를 안내드립니다."
        />
        <Card>
          <div className="rounded-3xl bg-mint p-5 text-forest">
            <p className="text-sm font-bold">접수 완료</p>
            <p className="mt-3 text-sm leading-7">
              보내주신 문의는 운영팀 접수함에 등록되었습니다. 확인 후 순차적으로
              연락드리겠습니다.
            </p>
          </div>
          <div className="mt-6 grid gap-3 text-sm">
            <div className="flex justify-between rounded-2xl bg-cream px-4 py-3">
              <span className="font-bold text-forest">상태</span>
              <span className="text-ink/65">신규 접수</span>
            </div>
            <div className="flex justify-between rounded-2xl bg-cream px-4 py-3">
              <span className="font-bold text-forest">다음 안내</span>
              <span className="text-ink/65">담당자 확인 후 연락</span>
            </div>
          </div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button href="/projects/new">입주 프로젝트 시작</Button>
            <Button href="/" variant="ghost">
              홈으로
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
