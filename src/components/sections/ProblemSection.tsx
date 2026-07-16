import { SectionTitle } from "@/components/ui/SectionTitle";

export function ProblemSection() {
  return (
    <section className="bg-white px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Problem"
          title="공간을 찾은 뒤가 더 어렵습니다."
          description="집, 사무실, 공장 모두 계약 전 확인할 것과 실제 사용을 시작하기 전 준비할 것이 많습니다. 기존 플랫폼은 공간 탐색, 권리 확인, 이사·청소·설치 서비스를 각각 따로 제공하지만 사용자는 여전히 체크리스트, 문서, 일정, 연결 요청을 여러 앱과 메모장, 카카오톡에서 관리해야 합니다."
        />
        <div className="mt-8 rounded-[28px] bg-cream p-6 text-lg font-semibold leading-8 text-forest md:p-8">
          문제는 서비스가 없는 것이 아니라, 입주·이전·사용 준비 과정이 하나로 연결되어 있지 않다는 점입니다.
        </div>
      </div>
    </section>
  );
}
