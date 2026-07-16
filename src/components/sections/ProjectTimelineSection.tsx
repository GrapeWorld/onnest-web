import { SectionTitle } from "@/components/ui/SectionTitle";
import { ProjectStageGroups } from "./ProjectStageGroups";

export function ProjectTimelineSection() {
  return (
    <section className="bg-cream px-5 py-16 md:py-24">
      <div className="mx-auto max-w-7xl">
        <SectionTitle
          eyebrow="Project"
          title="입주 프로젝트 10단계"
          description="집 후보 저장부터 퇴거 시 인수인계까지, 입주 전후의 확인과 연결을 세 개의 큰 흐름으로 관리합니다."
        />
        <div className="mt-10">
          <ProjectStageGroups />
        </div>
      </div>
    </section>
  );
}
