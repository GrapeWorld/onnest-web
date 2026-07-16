import { Card } from "@/components/ui/Card";

const projectStages = [
  {
    title: "탐색 및 확인",
    steps: ["집 후보 저장", "인수인계서 확인", "방문 전 체크리스트"],
  },
  {
    title: "계약 및 안전 확인",
    steps: ["계약 안전 체크패스", "보증보험 공식 채널 연결", "계약 당일 체크"],
  },
  {
    title: "입주 준비 및 다음 인수인계",
    steps: ["입주청소·이사 연결", "인터넷·보수·인테리어 연결", "렌탈·생활제품 맞춤 추천", "퇴거 시 다음 사용자에게 인수인계"],
  },
];

export function ProjectStageGroups() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {projectStages.map((stage, index) => (
        <Card key={stage.title} className={index === 1 ? "bg-mint" : "bg-white"}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-sm font-black text-white">
            {index + 1}
          </div>
          <h3 className="mt-5 text-2xl font-black text-forest">{stage.title}</h3>
          <ol className="mt-5 space-y-3">
            {stage.steps.map((step) => (
              <li key={step} className="rounded-2xl bg-cream/80 px-4 py-3 text-sm font-semibold text-ink/75">
                {step}
              </li>
            ))}
          </ol>
        </Card>
      ))}
    </div>
  );
}
