import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[24px] border border-forest/10 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft", className)}>
      {children}
    </div>
  );
}

export function FeatureCard({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <Card>
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-mint text-forest">
        {Icon ? <Icon className="h-5 w-5" strokeWidth={2.25} /> : "✓"}
      </div>
      <h3 className="text-lg font-bold text-forest">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-ink/70">{description}</p>
    </Card>
  );
}

export function PrincipleCard({
  category,
  does,
  doesNot,
}: {
  category: string;
  does: string;
  doesNot: string;
}) {
  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-wide text-sage">{category}</p>
      <div className="mt-4 flex items-start gap-3 rounded-2xl bg-mint px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-[11px] font-bold text-white">
          O
        </span>
        <p className="text-sm font-semibold leading-6 text-forest">{does}</p>
      </div>
      <div className="mt-3 flex items-start gap-3 rounded-2xl bg-cream px-4 py-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-ink/25 text-[11px] font-bold text-white">
          X
        </span>
        <p className="text-sm leading-6 text-ink/65">{doesNot}</p>
      </div>
    </Card>
  );
}
