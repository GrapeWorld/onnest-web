import { EyeOff, MessageSquareOff, PuzzleIcon, SplitSquareHorizontal } from "lucide-react";
import { problemPoints } from "@/data/features";
import { Card } from "@/components/ui/Card";
import { Section } from "@/components/ui/Section";
import { SectionTitle } from "@/components/ui/SectionTitle";

const icons = [EyeOff, MessageSquareOff, PuzzleIcon, SplitSquareHorizontal];

export function ProblemSection() {
  return (
    <Section className="bg-white">
      <SectionTitle
        eyebrow="Problem"
        title="공간을 찾은 뒤가 더 어렵습니다."
        description="집, 사무실, 공장 모두 계약 전 확인할 것과 실제 사용을 시작하기 전 준비할 것이 많습니다. 기존 플랫폼은 공간 탐색, 권리 확인, 이사·청소·설치 서비스를 각각 따로 제공하지만 사용자는 여전히 체크리스트, 문서, 일정, 연결 요청을 여러 앱과 메모장, 카카오톡에서 관리해야 합니다."
      />
      <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {problemPoints.map((point, index) => {
          const Icon = icons[index];
          return (
            <Card key={point.title} className="bg-cream/60">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-forest shadow-card">
                <Icon className="h-5 w-5" strokeWidth={2.25} />
              </div>
              <h3 className="mt-4 text-base font-bold leading-6 text-forest">{point.title}</h3>
              <p className="mt-3 text-sm leading-7 text-ink/70">{point.description}</p>
            </Card>
          );
        })}
      </div>
      <div className="mt-8 rounded-[28px] bg-cream p-6 text-lg font-semibold leading-8 text-forest md:p-8">
        문제는 서비스가 없는 것이 아니라, 입주·이전·사용 준비 과정이 하나로 연결되어 있지 않다는 점입니다.
      </div>
    </Section>
  );
}
