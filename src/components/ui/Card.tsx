import { cn } from "@/lib/cn";

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-[24px] border border-forest/10 bg-white p-6 shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-soft", className)}>
      {children}
    </div>
  );
}

export function FeatureCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-mint text-forest">✓</div>
      <h3 className="text-lg font-bold text-forest">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-ink/70">{description}</p>
    </Card>
  );
}

export function SolutionPillarCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="bg-cream/60">
      <p className="text-xs font-bold uppercase text-sage">Pillar</p>
      <h3 className="mt-3 text-xl font-bold text-forest">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-ink/70">{description}</p>
    </Card>
  );
}
