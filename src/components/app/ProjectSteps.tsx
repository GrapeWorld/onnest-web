import Link from "next/link";
import {
  projectSteps,
  stepStatusClassName,
  type ProjectStep,
} from "@/data/projectSteps";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { StepStatusControl } from "@/components/app/StepStatusControl";
import { StepChecklist } from "@/components/app/StepChecklist";

// 단계마다 다르지 않고 프로젝트 단위로 실제 존재하는 화면들만 연결한다.
function stepLinks(projectId: string) {
  return [
    { label: "생활 정보", href: `/projects/${projectId}/handover` },
    { label: "일정", href: `/projects/${projectId}/calendar` },
    { label: "서비스 연결", href: `/projects/${projectId}/services` },
  ];
}

export function ProjectStepGrid({
  projectId,
  statusBySlug,
}: {
  projectId: string;
  statusBySlug: Map<string, string>;
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      {projectSteps.map((step) => {
        const status = statusBySlug.get(step.slug) ?? "대기";
        return (
          <Link key={step.slug} href={`/projects/${projectId}/${step.slug}`}>
            <Card className="h-full p-5">
              <div className="flex items-start justify-between gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-black text-white">
                  {step.number}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${stepStatusClassName[status]}`}
                >
                  {status}
                </span>
              </div>
              <p className="mt-5 text-xs font-bold text-sage">{step.group}</p>
              <h3 className="mt-2 text-lg font-black text-forest">
                {step.title}
              </h3>
              <p className="mt-3 text-sm leading-7 text-ink/65">
                {step.summary}
              </p>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}

export function ProjectStepDetail({
  step,
  projectId,
  status,
  checkedItems,
}: {
  step: ProjectStep;
  projectId: string;
  status: string;
  checkedItems: string[];
}) {
  const previousStep = projectSteps.find(
    (item) => item.number === step.number - 1,
  );
  const nextStep = projectSteps.find((item) => item.number === step.number + 1);

  return (
    <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest text-base font-black text-white">
            {step.number}
          </span>
          <Badge>{step.group}</Badge>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${stepStatusClassName[status]}`}
          >
            {status}
          </span>
        </div>
        <h2 className="mt-5 text-3xl font-black text-forest">{step.title}</h2>
        <p className="mt-4 text-base leading-8 text-ink/70">{step.summary}</p>
        <div className="mt-6">
          <StepStatusControl
            projectId={projectId}
            slug={step.slug}
            status={status}
          />
        </div>
        <p className="mt-6 rounded-2xl bg-cream p-4 text-sm leading-7 text-ink/70">
          {step.note}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button href={`/projects/${projectId}`} variant="ghost">
            프로젝트 홈
          </Button>
          <Button href={`/projects/${projectId}/calendar`} variant="secondary">
            일정 보기
          </Button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {previousStep ? (
            <Button
              href={`/projects/${projectId}/${previousStep.slug}`}
              variant="ghost"
            >
              이전 단계: {previousStep.title}
            </Button>
          ) : (
            <div className="flex min-h-11 items-center justify-center rounded-full border border-forest/10 bg-cream px-5 py-3 text-sm font-semibold text-ink/45">
              첫 단계입니다
            </div>
          )}
          {nextStep ? (
            <Button href={`/projects/${projectId}/${nextStep.slug}`}>
              다음 단계: {nextStep.title}
            </Button>
          ) : (
            <Button href={`/projects/${projectId}`} variant="secondary">
              프로젝트 완료 보기
            </Button>
          )}
        </div>
      </Card>

      <div className="grid gap-5">
        <StepChecklist
          projectId={projectId}
          slug={step.slug}
          items={step.checklist}
          initialChecked={checkedItems}
        />
        <Card>
          <h3 className="text-xl font-black text-forest">바로 가기</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {stepLinks(projectId).map(({ label, href }) => (
              <Link
                key={href}
                href={href}
                className="rounded-2xl border border-forest/10 bg-white px-4 py-3 text-center text-sm font-bold text-forest transition duration-300 hover:-translate-y-0.5 hover:bg-cream"
              >
                {label}
              </Link>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
