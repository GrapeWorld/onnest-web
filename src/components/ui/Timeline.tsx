import { Card } from "./Card";

export function TimelineStep({ index, title }: { index: number; title: string }) {
  return (
    <li className="relative flex gap-4">
      <div className="flex flex-col items-center">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest text-sm font-bold text-white">
          {index}
        </span>
        <span className="mt-2 h-full w-px bg-forest/15" />
      </div>
      <Card className="mb-4 flex-1 p-4 shadow-none">
        <p className="font-semibold text-forest">{title}</p>
      </Card>
    </li>
  );
}

export function Timeline({ items }: { items: string[] }) {
  return (
    <ol>
      {items.map((item, index) => (
        <TimelineStep key={item} index={index + 1} title={item} />
      ))}
    </ol>
  );
}
