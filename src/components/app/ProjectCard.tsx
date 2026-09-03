import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { projectSteps } from "@/data/projectSteps";
import { formatDate } from "@/lib/dates";

export function ProjectCard({
  project,
}: {
  project: {
    id: string;
    name: string;
    spaceType: string;
    address: string | null;
    moveInDate: Date | null;
    stepStates: { status: string }[];
  };
}) {
  const done = project.stepStates.filter((s) => s.status === "완료").length;
  const progress = Math.round((done / projectSteps.length) * 100);

  return (
    <Link href={`/projects/${project.id}`} className="block min-w-0">
      <Card className="h-full p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="shrink-0 rounded-full bg-cream px-3 py-1 text-xs font-bold text-forest">
            {project.spaceType}
          </span>
          <span className="shrink-0 text-xs font-bold text-sage">{progress}%</span>
        </div>
        <h3 className="mt-4 break-words text-lg font-black text-forest">{project.name}</h3>
        <p className="mt-2 break-words text-sm text-ink/60">{project.address || "주소 미입력"}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-forest/10">
          <div className="h-full rounded-full bg-forest" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-3 text-xs text-ink/55">
          입주 예정일: {project.moveInDate ? formatDate(project.moveInDate) : "미정"}
        </p>
      </Card>
    </Link>
  );
}
