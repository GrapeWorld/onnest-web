import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function BuildingCard({ building }: { building: { id: string; name: string; address: string; tags: string[]; handoverStatus: string } }) {
  return (
    <Link href={`/buildings/${building.id}`}>
      <Card className="h-full hover:border-forest/30">
        <p className="text-xs font-bold uppercase text-sage">{building.handoverStatus}</p>
        <h2 className="mt-3 text-xl font-bold text-forest">{building.name}</h2>
        <p className="mt-2 text-sm text-ink/60">{building.address}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {building.tags.map((tag) => <span key={tag} className="rounded-full bg-mint px-3 py-1 text-xs font-semibold text-forest">{tag}</span>)}
        </div>
      </Card>
    </Link>
  );
}

export function ServiceLeadCard({ item }: { item: string[] }) {
  return (
    <Card>
      <p className="text-sm text-sage">{item[1]}</p>
      <h3 className="mt-2 text-lg font-bold text-forest">{item[0]}</h3>
      <p className="mt-3 text-sm text-ink/65">{item[2]}</p>
    </Card>
  );
}

export function AdminTablePreview({ title, columns }: { title: string; columns: string[] }) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-forest">{title}</h2>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-forest text-white">
            <tr>{columns.map((column) => <th key={column} className="p-3">{column}</th>)}</tr>
          </thead>
          <tbody>
            {[1, 2, 3].map((row) => (
              <tr key={row} className="border-b border-forest/10">
                {columns.map((column) => <td key={column} className="p-3 text-ink/65">더미 데이터 {row}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
