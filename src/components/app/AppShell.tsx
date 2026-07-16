import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const appNav = [
  ["검색", "/search"],
  ["새 프로젝트", "/projects/new"],
  ["내 정보", "/my"],
  ["관리자", "/admin"]
];

export function AppShell({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-cream/60 px-5 py-8 md:py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[28px] bg-white p-5 shadow-soft md:flex-row md:items-center md:justify-between">
          <Link href="/" className="text-xl font-black text-forest">ONNEST App</Link>
          <nav className="flex flex-wrap gap-2 text-sm font-semibold">
            {appNav.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-full bg-cream px-4 py-2 text-forest hover:bg-mint">
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <section className="mb-8">
          <Badge>Dummy Frontend</Badge>
          <h1 className="mt-4 text-3xl font-black text-forest md:text-5xl">{title}</h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-ink/70">{description}</p>
        </section>
        {children}
      </div>
    </main>
  );
}

export function MetricGrid({ items }: { items: string[][] }) {
  return (
    <div className="grid gap-4 md:grid-cols-4">
      {items.map(([label, value]) => (
        <Card key={label} className="p-5">
          <p className="text-sm text-ink/55">{label}</p>
          <p className="mt-2 text-2xl font-black text-forest">{value}</p>
        </Card>
      ))}
    </div>
  );
}

export function ChecklistPanel({ items }: { items: string[][] }) {
  return (
    <Card>
      <h2 className="text-xl font-bold text-forest">체크리스트</h2>
      <div className="mt-5 space-y-3">
        {items.map(([label, status]) => (
          <div key={label} className="flex items-center justify-between rounded-2xl bg-cream px-4 py-3 text-sm">
            <span className="font-semibold text-forest">{label}</span>
            <span className="text-ink/60">{status}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
