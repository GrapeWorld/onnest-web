import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function BuildingCard({
  building,
}: {
  building: {
    id: string;
    name: string;
    address: string;
    tags: string[];
    handoverStatus: string;
  };
}) {
  return (
    <Link href={`/buildings/${building.id}`}>
      <Card className="h-full hover:border-forest/30">
        <p className="text-xs font-bold uppercase text-sage">
          {building.handoverStatus}
        </p>
        <h2 className="mt-3 text-xl font-bold text-forest">{building.name}</h2>
        <p className="mt-2 text-sm text-ink/60">{building.address}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {building.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-forest"
            >
              {tag}
            </span>
          ))}
        </div>
      </Card>
    </Link>
  );
}
